/** تحميل ملف من رابط على جهاز المستخدم. لو المتصفح منع (CORS) بنفتح الرابط في تاب جديد. */
export async function downloadFromUrl(url: string, name: string): Promise<boolean> {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const blob = await r.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
    return true;
  } catch {
    window.open(url, "_blank");
    return false;
  }
}
