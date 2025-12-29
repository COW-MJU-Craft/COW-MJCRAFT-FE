import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <h1 className="text-3xl font-extrabold mb-10 text-gray-900">계정 생성</h1>

      {/* 프로세스 바 */}
      <div className="flex items-center space-x-4 mb-12 w-full max-w-md justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-[#003366] text-white rounded-full flex items-center justify-center font-bold shadow-md">
            1
          </div>
          <span className="text-xs mt-2 font-bold text-[#003366]">
            정보입력
          </span>
        </div>
        <div className="w-20 h-[2px] bg-gray-200 mb-4"></div>
        <div className="flex flex-col items-center opacity-40">
          <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">
            2
          </div>
          <span className="text-xs mt-2 font-medium">학번인증</span>
        </div>
      </div>

      <form className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#003366] transition-all text-black"
        />
        <input
          type="text"
          placeholder="학번을 입력하세요"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#003366] transition-all text-black"
        />
        <input
          type="password"
          placeholder="비밀번호를 설정하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#003366] transition-all text-black"
        />

        <button
          type="button"
          onClick={() => {
            alert('회원가입이 신청되었습니다.');
            navigate('/');
          }}
          className="w-full bg-gray-300 text-white p-4 rounded-full font-bold mt-8 hover:bg-[#003366] hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
        >
          가입 완료
        </button>
      </form>

      <button
        onClick={() => navigate('/')}
        className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        이미 계정이 있나요?{' '}
        <span className="font-bold border-b border-gray-400">로그인</span>
      </button>
    </div>
  );
};

export default SignupPage;
