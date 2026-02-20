export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // 부모 layout의 container padding(px-4 lg:px-6 py-6)을 상쇄해서 full-height 확보
  return (
    <div className="-mx-4 lg:-mx-6 -my-6 flex flex-col h-[calc(100vh-3.5rem)]">
      {children}
    </div>
  );
}
