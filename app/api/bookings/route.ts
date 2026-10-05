import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";

// 内存暂存待审批列表（生产环境中可替换为数据库）
let bookings: Array<{
  id: string;
  name: string;
  email: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "pending" | "approved" | "rejected";
}> = [];

// 获取预约列表
export async function GET() {
  return NextResponse.json({ bookings });
}

// 提交新预约 (同事调用)
export async function POST(req: Request) {
  const { name, email, title, startTime, endTime } = await req.json();

  if (!name || !email || !title || !startTime || !endTime) {
    return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
  }

  const newBooking = {
    id: Date.now().toString(),
    name,
    email,
    title,
    startTime,
    endTime,
    status: "pending" as const,
  };

  bookings.push(newBooking);
  return NextResponse.json({ message: "预约已提交，等待管理员审批！", booking: newBooking });
}

// 审批预约 (管理员调用)
export async function PATCH(req: Request) {
  const session: any = await getServerSession(authOptions);

  // 权限校验：仅管理员可进行审批
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "未经授权，仅管理员可审批日程" }, { status: 403 });
  }

  const { id, action } = await req.json(); // action: 'approve' | 'reject'
  const bookingIndex = bookings.findIndex((b) => b.id === id);

  if (bookingIndex === -1) {
    return NextResponse.json({ error: "未找到该预约" }, { status: 404 });
  }

  if (action === "reject") {
    bookings[bookingIndex].status = "rejected";
    return NextResponse.json({ message: "已拒绝预约" });
  }

  if (action === "approve") {
    const booking = bookings[bookingIndex];

    try {
      // 初始化 Google Calendar 客户端
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      auth.setCredentials({ access_token: session.accessToken });

      const calendar = google.calendar({ version: "v3", auth });

      // 将日程写入你的 Google Calendar
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: `[已审批] ${booking.title} - ${booking.name}`,
          description: `预约人: ${booking.name}\n邮箱: ${booking.email}`,
          start: { dateTime: new Date(booking.startTime).toISOString() },
          end: { dateTime: new Date(booking.endTime).toISOString() },
          attendees: [{ email: booking.email }],
        },
      });

      bookings[bookingIndex].status = "approved";
      return NextResponse.json({ message: "审批通过，已同步写入 Google 日历！" });
    } catch (err: any) {
      return NextResponse.json({ error: "写入 Google 日历失败: " + err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "无效的审批指令" }, { status: 400 });
}
