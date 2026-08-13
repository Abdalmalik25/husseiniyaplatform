import { Link } from "wouter";
import { ArrowRight, Award, Compass, DraftingCompass, LandPlot, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const fallbackTeam = [
  { name: "م. فريق المساحة والمخططات", title: "مهندس مساحة ومخططات أراضٍ", specialty: "الرفع المساحي، تقسيم الأراضي، وإعداد المخططات", experienceYears: 15, bio: "خبرة ميدانية في قراءة المواقع وتحويل البيانات إلى مخططات واضحة قابلة للاستخدام." },
  { name: "م. فريق التصميم", title: "مهندس معماري واستشاري", specialty: "التصميم المعماري ومراجعة المخططات", experienceYears: 12, bio: "يجمع بين الحس التصميمي والانضباط الفني لتقديم حلول عملية وأنيقة." },
  { name: "م. فريق العقار", title: "خبير تقييم واستشارات عقارية", specialty: "التثمين، دراسة الفرص، وتحليل المواقع", experienceYears: 10, bio: "قراءة مهنية للعقار والسوق تساعدك على اتخاذ قرار أكثر اتزاناً." },
  { name: "فريق الاستشارات", title: "مستشار مؤسسي وإداري", specialty: "الهياكل، الإجراءات، وتحسين الأداء", experienceYears: 12, bio: "نحوّل الاحتياج الإداري إلى مسارات عمل واضحة ومؤشرات قابلة للقياس." },
];

export default function Team() {
  const { data } = trpc.content.useQuery();
  const team = data?.team?.length ? data.team : fallbackTeam;
  return <div dir="rtl" className="min-h-screen bg-cream"><header className="border-b border-slate-200 bg-white/70"><div className="container flex h-20 items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-copper font-display font-bold">ح</div><span className="font-display font-bold">الحسينية <span className="text-copper">ALHUSAINIA</span></span></Link><Link href="/" className="flex items-center gap-2 text-sm text-copper"><ArrowRight className="h-4 w-4" />العودة للرئيسية</Link></div></header><main className="container py-20"><div className="mx-auto mb-12 max-w-2xl text-center"><div className="mb-3 text-sm font-bold tracking-[0.18em] text-copper">فريق الخبراء</div><h1 className="font-display text-4xl font-bold md:text-6xl">خبرات متعددة،<br /><span className="text-copper">ورؤية واحدة.</span></h1><p className="mt-5 leading-8 text-slate-600">فريق مهني يقرأ احتياجك من أكثر من زاوية، ويقدم لك رأياً واضحاً يمكن البناء عليه.</p></div><div className="grid gap-6 md:grid-cols-2">{team.map((member: any, index: number) => <Card key={member.name} className="border-0 bg-white shadow-soft"><CardContent className="p-8"><div className="mb-7 flex items-center justify-between"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand text-copper">{index % 3 === 0 ? <LandPlot /> : index % 3 === 1 ? <DraftingCompass /> : index % 3 === 2 ? <Compass /> : <Users />}</div><div className="flex items-center gap-2 text-sm font-bold text-copper"><Award className="h-4 w-4" />{member.experienceYears}+ سنة</div></div><h2 className="font-display text-2xl font-bold">{member.name}</h2><p className="mt-2 font-semibold text-copper">{member.title}</p><p className="mt-5 leading-8 text-slate-600">{member.bio}</p><div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">التخصص: {member.specialty}</div></CardContent></Card>)}</div></main></div>;
}
