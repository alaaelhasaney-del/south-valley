import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // تأكد من المسار الصحيح للملف

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async (user) => {
      try {
        if (!user) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // 2. جلب دور المستخدم من جدول users
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role, permissions")
          .eq("email", user.email) // البحث عن طريق الإيميل أضمن لتجنب تعارض أنواع الـ ID
          .single();

        if (userError) {
          console.warn(
            "User profile not found in public.users, using defaults.",
          );
          setPermissions([]);
          return;
        }

        setPermissions(userData.permissions || []);
      } catch (err) {
        console.error("Supabase query failed:", err.message);
      } finally {
        setLoading(false);
      }
    };

    // مراقبة تغييرات حالة تسجيل الدخول
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchPermissions(session.user);
      } else {
        setPermissions([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = (resource, action) => {
    const perm = permissions.find((p) => p.resource === resource);
    if (!perm) return false;

    const map = {
      view: perm.can_read,
      create: perm.can_create,
      edit: perm.can_update,
      delete: perm.can_delete,
    };
    return map[action] || false;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
