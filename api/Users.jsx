import React, { useState } from "react";
import axios from "axios";

const Users = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "student",
    tenant_id: 1,
    branch_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: "", text: "" });

    try {
      /**
       * هام جداً:
       * لا نستخدم supabase.from('users').insert() هنا أبداً.
       * الـ API في السيرفر سيقوم بإنشاء المستخدم في Auth،
       * والـ Trigger في قاعدة البيانات سيقوم بإنشاء البروفايل تلقائياً.
       */
      // التعديل: المسار الصحيح كما هو محدد في server.js
      // اعمل إنشاء المستخدم عبر السيرفر فقط لتجنب أي insert مباشر على Supabase table "users"
      // (الـ FK عندك مربوط بـ auth.users(id) وقد يسبب 23503 عند mismatch)
      const response = await axios.post("/api/admin/users/create", formData);

      if (response.status === 201) {
        setStatusMsg({
          type: "success",
          text: "تم إنشاء المستخدم والبروفايل بنجاح!",
        });
        // إعادة ضبط النموذج أو تحديث القائمة
        setFormData({
          email: "",
          password: "",
          name: "",
          role: "student",
          tenant_id: 1,
          branch_ids: [],
        });
      }
    } catch (error) {
      console.error("Submission Error:", error.response?.data || error.message);
      const errorText =
        error.response?.data?.error || "حدث خطأ أثناء الاتصال بالسيرفر";
      setStatusMsg({ type: "error", text: `فشل الحفظ: ${errorText}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">إضافة مستخدم جديد</h2>

      {statusMsg.text && (
        <div
          className={`p-4 mb-4 rounded ${statusMsg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <input
          type="text"
          placeholder="الاسم الكامل"
          className="w-full p-2 border rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          className="w-full p-2 border rounded"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        {/* ... باقي الحقول (كلمة المرور، الدور، إلخ) ... */}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "جاري الحفظ..." : "حفظ المستخدم"}
        </button>
      </form>
    </div>
  );
};

export default Users;
