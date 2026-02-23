export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // 부모 layout의 container padding을 상쇄 → 채팅창 full-height
  return (
    <div className="-mx-4 lg:-mx-6 -my-6 flex flex-col h-[calc(100vh-3.5rem)] min-h-0">
      {children}
    </div>
  );
}
