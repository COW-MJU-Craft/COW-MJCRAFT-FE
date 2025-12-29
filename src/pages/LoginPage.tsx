import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.length === 8) {
      navigate('/main');
    } else {
      alert('학번 8자리를 입력해주세요.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* 로고 섹션 */}
      <div className="mb-10">
        <img
          src="/src/assets/logo1.png"
          alt="Myongji University"
          className="w-60 h-auto object-contain"
        />
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">
            학번
          </label>
          <input
            type="text"
            placeholder="학번 8자리를 입력하세요"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none transition-all text-black"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">
            비밀번호
          </label>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none transition-all text-black"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#003366] text-white p-4 rounded-xl font-bold hover:bg-[#002244] transform active:scale-[0.98] transition-all shadow-lg cursor-pointer"
        >
          로그인
        </button>
      </form>

      <button
        onClick={() => navigate('/signup')}
        className="mt-8 text-sm text-gray-500 hover:text-[#003366] transition-colors"
      >
        처음이신가요?{' '}
        <span className="text-[#003366] font-bold underline underline-offset-4">
          회원가입 하기
        </span>
      </button>
    </div>
  );
};

export default LoginPage;
