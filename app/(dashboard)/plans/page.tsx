export default function PlansPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16 bg-stone-50">
      <div className="flex flex-col items-center gap-12 w-[564px] max-w-full">
        <img
          src="/plans-illustration.svg"
          alt=""
          className="w-[368px] h-[190px] object-contain"
        />
        <div className="flex flex-col items-center gap-[9px] text-center">
          <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.144px] text-[rgba(24,24,25,0.9)]">
            Plans are coming soon
          </h1>
          <p className="text-[16px] font-medium leading-6 text-[rgba(24,24,25,0.7)]">
            Soon, you&rsquo;ll be able to create and share personalised plans with students
            to help them work towards their learning goals.
          </p>
        </div>
      </div>
    </div>
  )
}
