import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Smartphone, ShieldCheck, Wrench, Globe } from "lucide-react";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";

// غيّر الرابط ده لو نقلت ملف التطبيق. "latest" بيفتح آخر إصدار دايمًا.
const APK_PAGE = "https://github.com/pedoow1/assuit-scidream-app/releases/latest";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "تحميل التطبيق — Assuit SciDream" },
      { name: "description", content: "حمّل تطبيق Assuit SciDream لأندرويد، وحلول مشاكل التثبيت والتشغيل." },
    ],
  }),
  component: DownloadPage,
});

const FIXES: { q: string; a: string[] }[] = [
  {
    q: "ظهرلي: «لم يتم تثبيت التطبيق لأن الحزمة تبدو غير صالحة»",
    a: [
      "غالبًا الملف اتحمّل ناقص أو بايظ (حجمه كبير وأي قطع في النت بيبوّظه). امسح الملف وحمّله تاني من الرابط فوق باستخدام Chrome.",
      "اتأكد إن التحميل خلص تمامًا قبل ما تفتح الملف، ولو الاسم بينتهي بـ .crdownload أو .part يبقى لسه ما خلصش.",
      "ما تحمّلوش من تليجرام أو واتساب: حمّله من الرابط مباشرة. لو حد بعتهولك على واتساب، حمّله من الموقع بدل كده.",
      "ما تعدّلش على اسم الملف، وخلّي الامتداد .apk.",
      "لازم يكون فيه مساحة فاضية على الموبايل لا تقل عن 500 ميجا.",
      "جرّب تفتح الملف من تطبيق «الملفات» بدل ما تفتحه من إشعار التحميل.",
    ],
  },
  {
    q: "ظهرلي: «التطبيق غير متوافق مع جهازك» أو «App not compatible»",
    a: [
      "التطبيق محتاج أندرويد حديث نسبيًا (يفضّل أندرويد 8 أو أحدث). من الإعدادات ← حول الهاتف شوف إصدار أندرويد.",
      "لو جهازك قديم جدًا ممكن ما يشتغلش عليه، ساعتها استخدم الموقع من المتصفح.",
    ],
  },
  {
    q: "الموبايل بيقولي «محظور» أو «Play Protect منع التثبيت»",
    a: [
      "اضغط «مزيد من التفاصيل» ← «تثبيت على أي حال» (Install anyway).",
      "ولو الرسالة مش بتسيبك: افتح متجر Play ← صورة حسابك ← Play Protect ← الإعدادات، وأوقف «فحص التطبيقات» مؤقتًا وارجع شغّله بعد التثبيت.",
    ],
  },
  {
    q: "مش قادر أثبّت: «لأسباب أمنية، التثبيت من مصادر غير معروفة محظور»",
    a: [
      "افتح الإعدادات ← الأمان (أو التطبيقات ← وصول خاص) ← «تثبيت تطبيقات غير معروفة»، وفعّل الإذن للمتصفح (Chrome) أو لتطبيق الملفات اللي بتفتح منه الملف.",
      "على سامسونج: لو ظاهر «Auto Blocker» اقفله من الإعدادات ← الأمان والخصوصية ← Auto Blocker، وبعد التثبيت ممكن ترجّعه.",
      "على شاومي/ريدمي/بوكو: فعّل «تثبيت تطبيقات غير معروفة» للتطبيق اللي بتفتح منه الملف، ولو لسه بيرفض جرّب تفتح الملف من تطبيق «مدير الملفات».",
    ],
  },
  {
    q: "ظهرلي: «التطبيق ما اتثبتش، تعارض مع تطبيق موجود»",
    a: [
      "معناها إن فيه نسخة قديمة بتوقيع مختلف. امسح النسخة القديمة (الإعدادات ← التطبيقات ← Assuit SciDream ← إلغاء التثبيت) وبعدين ثبّت الجديدة.",
    ],
  },
  {
    q: "التطبيق اتثبّت بس ما بيفتحش أو بيقفل لوحده",
    a: [
      "أعد تشغيل الموبايل وجرّب تاني.",
      "امسح بيانات التطبيق: الإعدادات ← التطبيقات ← Assuit SciDream ← التخزين ← «مسح البيانات».",
      "اتأكد إن التاريخ والوقت على الموبايل «تلقائي» (الإعدادات ← إدارة عامة ← التاريخ والوقت). لو التاريخ غلط، الاتصال الآمن بيفشل والتطبيق ما بيحمّلش.",
      "اقفل التطبيقات الكتير الشغالة في الخلفية، لو الموبايل رامه قليلة.",
      "امسح التطبيق وثبّت آخر نسخة من الرابط فوق.",
    ],
  },
  {
    q: "التطبيق بيفضل على شاشة البداية أو مش بيحمّل بيانات",
    a: [
      "اتأكد إن الإنترنت شغال، وجرّب تقفل أي VPN أو DNS خاص.",
      "اتأكد إن «توفير البيانات» أو «تقييد البيانات في الخلفية» مش مفعّل للتطبيق.",
      "لو الجهاز من غير خدمات جوجل (بعض أجهزة هواوي): التطبيق هيشتغل لكن الإشعارات ممكن ما توصلش.",
    ],
  },
];

function DownloadPage() {
  return (
    <div className="relative min-h-screen">
      <StarsBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> الرئيسية
          </Link>
          <Logo />
        </div>

        <div className="cosmic-card mt-6 rounded-3xl p-6 text-center">
          <Smartphone className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-3 font-display text-2xl">تطبيق Assuit SciDream</h1>
          <p className="mt-2 text-sm text-foreground/70">لأجهزة أندرويد. التحميل مجاني ومن غير حساب.</p>
          <a
            href={APK_PAGE}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            <Download className="h-5 w-5" /> تحميل آخر إصدار
          </a>
          <p className="mt-3 text-xs text-foreground/55">
            هتفتح صفحة الإصدارات: اضغط على ملف الـ <span dir="ltr">.apk</span> اللي في آخر الصفحة.
          </p>
        </div>

        <div className="cosmic-card mt-4 rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg"><ShieldCheck className="h-5 w-5 text-accent" /> خطوات التثبيت</h2>
          <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm leading-7 text-foreground/80">
            <li>حمّل الملف من الزر فوق باستخدام Chrome، وانتظر لحد ما التحميل يخلص تمامًا.</li>
            <li>افتح الملف. لو طلب إذن «تثبيت تطبيقات غير معروفة» فعّله للمتصفح أو للملفات.</li>
            <li>لو ظهرت رسالة Play Protect اختار «تثبيت على أي حال».</li>
            <li>بعد التثبيت افتح التطبيق وسجّل الدخول بحساب Google.</li>
          </ol>
        </div>

        <div className="cosmic-card mt-4 rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg"><Wrench className="h-5 w-5 text-accent" /> لو واجهتك مشكلة</h2>
          <div className="mt-3 space-y-2">
            {FIXES.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border/60 bg-card/40 p-3">
                <summary className="cursor-pointer list-none text-sm font-semibold marker:content-none">{f.q}</summary>
                <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-foreground/80">
                  {f.a.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </details>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-foreground/60">
            لو لسه المشكلة موجودة ابعت لنا: <b>موديل الموبايل</b> و<b>إصدار أندرويد</b> وصورة من رسالة الخطأ، عشان نحلها.
          </p>
        </div>

        <div className="cosmic-card mt-4 rounded-3xl p-5 text-center">
          <Globe className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-2 text-sm text-foreground/75">مفيش وقت للتثبيت؟ الموقع بيشتغل من المتصفح على أي جهاز، بنفس المميزات.</p>
          <Link to="/" className="mt-3 inline-flex rounded-full border border-border px-5 py-2 text-sm hover:border-accent">افتح الموقع</Link>
        </div>
      </div>
    </div>
  );
}
