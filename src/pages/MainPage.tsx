const MainPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-[#003366]">MJU DASHBOARD</h1>
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">반갑습니다!</h2>
          <p className="text-gray-500">
            2025 COW 프로젝트 메인 페이지에 오신 것을 환영합니다.
          </p>
        </div>
      </main>
    </div>
  );
};

export default MainPage;
