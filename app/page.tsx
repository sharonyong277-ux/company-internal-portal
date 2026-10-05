"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", title: "", startTime: "", endTime: "" });
  const [message, setMessage] = useState("");

  const fetchBookings = async () => {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    fetchBookings();
  };

  const handleApprove = async (id: string, action: "approve" | "reject") => {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    alert(data.message || data.error);
    fetchBookings();
  };

  const isAdmin = session?.user?.email === "sharonyong277@gmail.com";

  return (
    <main style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1>🏢 公司内部日程预约与审批系统</h1>

      {/* 登录控制台 */}
      <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "8px", marginBottom: "30px" }}>
        {!session ? (
          <div>
            <p>管理员状态：未登录（审批功能需管理员登录）</p>
            <button onClick={() => signIn("google")} style={{ padding: "8px 16px", cursor: "pointer" }}>
              🔑 Google 账号登录 (管理员)
            </button>
          </div>
        ) : (
          <div>
            <p>已登录：<strong>{session.user?.email}</strong> {isAdmin && " (👑 管理员)"}</p>
            <button onClick={() => signOut()} style={{ padding: "6px 12px", cursor: "pointer" }}>退出登录</button>
          </div>
        )}
      </div>

      {/* 同事预约表单 */}
      <section style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px", marginBottom: "30px" }}>
        <h2>📅 提交预约日程</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="你的姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input type="email" placeholder="你的邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="会议/事项主题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label>开始时间: <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label>
          <label>结束时间: <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></label>
          <button type="submit" style={{ padding: "10px", background: "#0070f3", color: "#fff", border: "none", borderRadius: "4px" }}>提交预约</button>
        </form>
        {message && <p style={{ color: "green", marginTop: "10px" }}>{message}</p>}
      </section>

      {/* 待审批列表 */}
      <section>
        <h2>📋 预约审批列表</h2>
        {bookings.length === 0 ? <p>暂无预约请求</p> : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {bookings.map((b) => (
              <li key={b.id} style={{ borderBottom: "1px solid #eee", padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{b.title}</strong> ({b.name} - {b.email})<br />
                  <small>{new Date(b.startTime).toLocaleString()} ~ {new Date(b.endTime).toLocaleString()}</small><br />
                  <span>状态: <strong>{b.status}</strong></span>
                </div>
                {isAdmin && b.status === "pending" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleApprove(b.id, "approve")} style={{ background: "green", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px" }}>通过并写入日历</button>
                    <button onClick={() => handleApprove(b.id, "reject")} style={{ background: "red", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px" }}>拒绝</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
