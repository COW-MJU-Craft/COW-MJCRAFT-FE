import { Link } from 'react-router-dom';
import CustomerEnrollmentCard from '../../../features/customer/CustomerEnrollmentCard';
import Reveal from '../../../components/ui/Reveal';

export default function CustomerEnrollmentPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap gap-4 lg:flex-col lg:items-start">
          <Link
            to="/orders/lookup"
            className="inline-flex items-center gap-2 font-heading text-3xl text-primary hover:opacity-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            비밀번호 등록/재설정
          </Link>
          <p className="mt-2 text-sm text-slate-600 lg:mt-0">
            기존 주문자도 이메일 인증으로 비밀번호를 새로 등록할 수 있어요.
          </p>
        </div>
      </Reveal>

      <Reveal delayMs={100} className="mt-6">
        <CustomerEnrollmentCard />
      </Reveal>
    </div>
  );
}
