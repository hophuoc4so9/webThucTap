import { useEffect, useRef, useState } from "react";

export const HeroBanner = () => {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      setMouse({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative min-h-screen overflow-hidden font-sans bg-gradient-to-br from-sky-100 via-blue-50 to-white"
    >
      <div className="pointer-events-none absolute -top-72 -right-44 h-[750px] w-[750px] rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.4),transparent_65%)]" />
      <div className="pointer-events-none absolute -bottom-44 -left-28 h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,rgba(186,230,255,0.45),transparent_65%)]" />
      <div
        className="pointer-events-none absolute z-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.1),transparent_65%)] transition-[left,top] duration-300 ease-out"
        style={{ left: `${mouse.x}%`, top: `${mouse.y}%` }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 mx-auto grid max-w-screen-xl grid-cols-1 items-center gap-12 px-16 py-16 lg:grid-cols-[2.0fr_0fr]">
        {/* ── LEFT ── */}
        <div className="flex flex-col">
          {/* Eyebrow badge */}
          <div className="mb-6 flex w-fit animate-[fadeUp_0.6s_0.1s_both] items-center gap-2 rounded-full border-2 border-blue-200 bg-white px-4 py-1.5 shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            <span className="text-xs font-semibold text-sky-700">
              🎓 Nền tảng tuyển dụng chính thức – ĐH Thủ Dầu Một
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-5 animate-[fadeUp_0.6s_0.2s_both] text-5xl font-black leading-[1.13] tracking-tight text-blue-950 xl:text-6xl">
            Tìm kiếm{" "}
            <span className="bg-gradient-to-r from-blue-700 to-sky-400 bg-clip-text text-transparent">
              cơ hội
              <br />
              nghề nghiệp
            </span>
            <br />
            dành cho sinh viên{" "}
            <span className="relative inline-block">
              TDM
              <span className="absolute bottom-1 left-0 right-0 -z-10 h-[7px] rounded-full bg-sky-200" />
            </span>
          </h1>

          {/* Description */}
          <p className="mb-9 animate-[fadeUp_0.6s_0.32s_both] max-w-[500px] text-base leading-relaxed text-blue-700/70">
            Kết nối sinh viên Đại học Thủ Dầu Một với hàng trăm doanh nghiệp uy
            tín. Tìm việc thực tập, part-time và toàn thời gian - tất cả trong
            một nơi.
          </p>

          {/* Search */}
          {/* <div className="mb-4 flex animate-[fadeUp_0.6s_0.44s_both] overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-lg shadow-blue-100 transition focus-within:border-blue-400 focus-within:shadow-blue-200">
            <span className="pl-4 text-lg text-blue-300 self-center">🔍</span>
            <input
              className="flex-1 bg-transparent px-3 py-3.5 text-sm text-blue-900 outline-none placeholder:text-blue-200"
              placeholder="Tìm vị trí, công ty, kỹ năng..."
            />
            <div className="my-2.5 w-px bg-blue-100" />
            <button className="m-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-sky-400 px-6 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:-translate-y-px hover:shadow-lg">
              Tìm kiếm
            </button>
          </div> */}

          {/* Hot tags */}
          {/* <div className="mb-10 flex animate-[fadeUp_0.6s_0.54s_both] flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-sky-400">🔥 Phổ biến:</span>
            {hotTags.map(t => (
              <span key={t} className="cursor-pointer rounded-full border-2 border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition hover:border-blue-700 hover:bg-blue-700 hover:text-white">
                {t}
              </span>
            ))}
          </div> */}

          {/* Stats */}
          {/* <div className="flex animate-[fadeUp_0.6s_0.65s_both] gap-10 border-t-2 border-blue-100 pt-8">
            {stats.map(s => (
              <div key={s.lbl}>
                <p className="text-3xl font-black text-blue-700">{s.num}</p>
                <p className="text-xs font-medium text-sky-400">{s.lbl}</p>
              </div>
            ))}
          </div> */}
        </div>

        {/* ── RIGHT ── */}
        <div className="hidden animate-[fadeRight_0.7s_0.6s_both] flex-col gap-3 lg:flex"></div>
      </div>

      {/* Keyframe animations (nhỏ gọn) */}
      <style>{`
        @keyframes fadeUp    { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeRight { from { opacity:0; transform:translateX(28px) } to { opacity:1; transform:translateX(0) } }
      `}</style>
    </div>
  );
};
