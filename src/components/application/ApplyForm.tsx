import { useMemo, useState } from 'react';
import type { Project } from '../../api/site/projects';

type Step = 1 | 2 | 3 | 4 | 5;

type AgreementState = {
  privacy: boolean;
  noRefund: boolean;
  noProxy: boolean;
};

type BuyerInfo = {
  campus: '' | '자연캠퍼스' | '인문캠퍼스';
  status: '' | '대학(원)생' | '교직원' | '외부인';
  name: string;
  major: string;
  studentId: string;
  phone: string;
  source: string;
};

type OrderInfo = {
  stickerQty: number;
  badgeQty: number;
  keyringQty: number;
  packaging: '' | 'yes' | 'no';
  confirmQty: boolean;
};

type PickupInfo = {
  method: '' | '현장 수령' | '택배 배송';
};

type PaymentInfo = {
  depositor: string;
  depositDate: string;
  depositAmount: string;
};

export default function ApplyForm({ project }: { project: Project }) {
  const canApply = project.status === 'OPEN';
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);

  const [agreements, setAgreements] = useState<AgreementState>({
    privacy: false,
    noRefund: false,
    noProxy: false,
  });

  const [buyer, setBuyer] = useState<BuyerInfo>({
    campus: '',
    status: '',
    name: '',
    major: '',
    studentId: '',
    phone: '',
    source: '',
  });

  const [order, setOrder] = useState<OrderInfo>({
    stickerQty: 0,
    badgeQty: 0,
    keyringQty: 0,
    packaging: '',
    confirmQty: false,
  });

  const [pickup, setPickup] = useState<PickupInfo>({
    method: '',
  });

  const [payment, setPayment] = useState<PaymentInfo>({
    depositor: '',
    depositDate: '',
    depositAmount: '',
  });

  const totalOrderQty =
    order.stickerQty + order.badgeQty + order.keyringQty;
  const keyringPrice = 21000;
  const packagingPrice = 1000;

  const keyringTotal = order.keyringQty * keyringPrice;
  const packagingTotal =
    order.packaging === 'yes' ? order.keyringQty * packagingPrice : 0;

  const stepValid = useMemo(() => {
    if (step === 1) {
      return agreements.privacy && agreements.noRefund && agreements.noProxy;
    }
    if (step === 2) {
      if (!buyer.campus || !buyer.status) return false;
      if (!buyer.name.trim() || !buyer.phone.trim() || !buyer.source) {
        return false;
      }
      if (buyer.status === '대학(원)생') {
        if (!buyer.major.trim() || !buyer.studentId.trim()) return false;
      }
      return true;
    }
    if (step === 3) {
      if (totalOrderQty <= 0) return false;
      if (order.keyringQty > 0 && !order.packaging) return false;
      if (!order.confirmQty) return false;
      return true;
    }
    if (step === 4) {
      if (!pickup.method) return false;
      if (buyer.campus === '자연캠퍼스' && pickup.method !== '택배 배송') {
        return false;
      }
      if (
        order.keyringQty > 0 &&
        order.packaging === 'no' &&
        pickup.method === '택배 배송'
      ) {
        return false;
      }
      return true;
    }
    if (step === 5) {
      return (
        payment.depositor.trim().length > 0 &&
        payment.depositDate.trim().length > 0 &&
        payment.depositAmount.trim().length > 0
      );
    }
    return false;
  }, [
    step,
    agreements,
    buyer,
    order,
    pickup,
    payment,
    totalOrderQty,
  ]);

  if (!canApply) {
    return (
      <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-600">
        {project.status === 'CLOSED'
          ? '마감된 프로젝트입니다. 신청이 불가능해요.'
          : '아직 준비 중인 프로젝트에요.'}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-2xl bg-primary/10 p-6 text-sm font-bold text-primary">
        신청이 완료되었어요. 입력 내용을 확인한 뒤 안내드릴게요.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!stepValid) return;
        const payload = {
          buyer,
          order,
          pickup,
          payment,
          agreements,
        };
        console.log('apply payload', payload);
        setSubmitted(true);
      }}
      className="mt-6 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-700">
          굿즈 신청서 (총 5단계)
        </div>
        <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
          {step} / 5
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <div className="text-lg font-bold text-slate-900">굿즈</div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>슬로건 메탈 스티커</li>
              <li>원형 로고 금속 뱃지</li>
              <li>베이비마루 키링 인형</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-bold text-slate-800">판매기간</div>
            <div className="mt-2">
              [스티커/뱃지] 물품 수령 기간 : 9월 둘째주, 인문캠(서울)
            </div>
            <div className="mt-1">
              [베이비 마루 키링 인형] 물품 수령 기간 : 12월 첫째주, 인문캠(서울)
            </div>
            <p className="mt-3 text-xs text-slate-500">
              현장수령 일정은 추석, 중추절로 인해 일정이 변동될 수 있으며,
              상세 일정은 명지공방 인스타그램에 공지됩니다.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              자연캠(용인)은 택배배송으로만 진행됩니다.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-bold text-slate-700">
                개인정보 수집 및 이용 동의
              </div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                주문자 및 수령자 확인을 위해 이름, 연락처를 수집하며 물품 수령 기간 종료
                후 1개월간 보관 후 폐기됩니다. 결과보고서 제출 및 배송 송장 등록을 위해
                일부 정보가 활용될 수 있습니다.
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={agreements.privacy}
                  onChange={(e) =>
                    setAgreements((prev) => ({
                      ...prev,
                      privacy: e.target.checked,
                    }))
                  }
                />
                동의합니다.
              </label>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-700">
                환불 및 교환 불가 정책 동의
              </div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                수령 이후 발생하는 제품의 흠집, 오염, 인쇄불량, 파손 등은 교환 및
                환불이 불가합니다.
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={agreements.noRefund}
                  onChange={(e) =>
                    setAgreements((prev) => ({
                      ...prev,
                      noRefund: e.target.checked,
                    }))
                  }
                />
                동의합니다.
              </label>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-700">
                대리수령 불가 정책 동의
              </div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                본 굿즈는 본인 확인 후 직접 수령 절차를 진행하며, 대리수령은
                불가합니다.
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={agreements.noProxy}
                  onChange={(e) =>
                    setAgreements((prev) => ({
                      ...prev,
                      noProxy: e.target.checked,
                    }))
                  }
                />
                동의합니다.
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-bold text-slate-900">
            구매자 정보 작성
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                소속캠퍼스*
              </div>
              <select
                value={buyer.campus}
                onChange={(e) => {
                  const campus = e.target.value as BuyerInfo['campus'];
                  setBuyer((prev) => ({
                    ...prev,
                    campus,
                  }));
                  if (campus === '자연캠퍼스') {
                    setPickup((prev) => ({ ...prev, method: '택배 배송' }));
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              >
                <option value="" disabled>
                  선택
                </option>
                <option value="자연캠퍼스">자연캠(용인)</option>
                <option value="인문캠퍼스">인문캠(서울)</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">신분*</div>
              <select
                value={buyer.status}
                onChange={(e) =>
                  setBuyer((prev) => ({
                    ...prev,
                    status: e.target.value as BuyerInfo['status'],
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              >
                <option value="" disabled>
                  선택
                </option>
                <option value="대학(원)생">대학(원)생</option>
                <option value="교직원">교직원</option>
                <option value="외부인">외부인</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
            명지대학(원)생을 위한 정보 작성 섹션입니다.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                이름*
              </div>
              <input
                value={buyer.name}
                onChange={(e) =>
                  setBuyer((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="김명지"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                휴대폰 번호*
              </div>
              <input
                value={buyer.phone}
                onChange={(e) =>
                  setBuyer((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="010-xxxx-xxxx"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <div className="mt-1 text-xs text-slate-500">
                추후 상품 수령 연락을 위한 수집 내용입니다.
              </div>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                소속학과
              </div>
              <input
                value={buyer.major}
                onChange={(e) =>
                  setBuyer((prev) => ({ ...prev, major: e.target.value }))
                }
                placeholder="00학과(부)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                disabled={buyer.status !== '대학(원)생'}
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">학번</div>
              <input
                value={buyer.studentId}
                onChange={(e) =>
                  setBuyer((prev) => ({ ...prev, studentId: e.target.value }))
                }
                placeholder="60xx0000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                disabled={buyer.status !== '대학(원)생'}
              />
            </label>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-700">
              알게 된 경로*
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[
                '에브리타임 게시물',
                '명지공방(明智工房) 인스타그램',
                '지인 소개',
                '물품 전시',
                '교내 포스터',
              ].map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="source"
                    checked={buyer.source === item}
                    onChange={() =>
                      setBuyer((prev) => ({ ...prev, source: item }))
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              추후 마케팅 데이터로 사용하기 위한 질문입니다.
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-bold text-slate-900">상품 주문서</div>
          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
            명지공방의 프로젝트는 저마진 구조로 운영되며, 수령 이후 교환이나 환불은
            불가능합니다.
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
              <div>
                <div className="text-sm font-bold text-slate-700">
                  베이비 마루 인형 키링 (21,000원)
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  인형 단가 15,000원 + 샘플 제작비 4,950원/개 + 키 체인 250원 + 안전
                  마진 800원
                </div>
              </div>
              <input
                type="number"
                min={0}
                value={order.keyringQty}
                onChange={(e) =>
                  setOrder((prev) => ({
                    ...prev,
                    keyringQty: Number(e.target.value || 0),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-700">
                인형 패키징 (+1,000원 * 인형 개수)
              </div>
              <div className="mt-2 text-xs text-slate-500">
                패키징 미선택 시 현장수령만 가능합니다. 인형 수량과 동일하게 패키징이
                적용됩니다.
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="packaging"
                    checked={order.packaging === 'yes'}
                    onChange={() =>
                      setOrder((prev) => ({ ...prev, packaging: 'yes' }))
                    }
                  />
                  패키징 O
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="packaging"
                    checked={order.packaging === 'no'}
                    onChange={() =>
                      setOrder((prev) => ({ ...prev, packaging: 'no' }))
                    }
                  />
                  패키징 X
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
              <div className="text-sm font-bold text-slate-700">
                슬로건 메탈 스티커 수량
              </div>
              <input
                type="number"
                min={0}
                value={order.stickerQty}
                onChange={(e) =>
                  setOrder((prev) => ({
                    ...prev,
                    stickerQty: Number(e.target.value || 0),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
              <div className="text-sm font-bold text-slate-700">
                원형 로고 금속 뱃지 수량
              </div>
              <input
                type="number"
                min={0}
                value={order.badgeQty}
                onChange={(e) =>
                  setOrder((prev) => ({
                    ...prev,
                    badgeQty: Number(e.target.value || 0),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-bold text-slate-800">예상 합계</div>
              <div className="mt-2 flex flex-wrap gap-6 text-xs">
                <span>인형 금액: {keyringTotal.toLocaleString()}원</span>
                <span>패키징: {packagingTotal.toLocaleString()}원</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={order.confirmQty}
                onChange={(e) =>
                  setOrder((prev) => ({ ...prev, confirmQty: e.target.checked }))
                }
              />
              구매 수량을 다시 확인했습니다.
            </label>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-bold text-slate-900">
            물품 수령 장소 및 방법
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            인문캠(서울) 학생회관 10층 창업동아리실, S21006
            <br />
            자연캠(용인)은 택배 배송으로만 진행됩니다.
          </div>
          <div className="text-xs text-slate-500">
            스티커/뱃지, 인형 수령 방법이 다를 경우 택배 배송을 선택해주세요.
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pickup"
                checked={pickup.method === '현장 수령'}
                onChange={() =>
                  setPickup((prev) => ({ ...prev, method: '현장 수령' }))
                }
                disabled={buyer.campus === '자연캠퍼스'}
              />
              현장 수령
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pickup"
                checked={pickup.method === '택배 배송'}
                onChange={() =>
                  setPickup((prev) => ({ ...prev, method: '택배 배송' }))
                }
              />
              택배 배송
            </label>
          </div>

          {order.keyringQty > 0 && order.packaging === 'no' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              패키징 미선택 시 인형은 현장 수령만 가능합니다.
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-bold text-slate-900">입금 인증</div>
          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
            입금 계좌 : 1002-1509-0210 토스뱅크 (예금주 : 곽재영)
          </div>
          <div className="text-xs text-slate-500">
            수익의 10%는 명지대학교 브랜드 활용 기여금으로 지불되고, 나머지는 기부
            또는 다음 프로젝트 예산으로 사용됩니다.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                입금자명*
              </div>
              <input
                value={payment.depositor}
                onChange={(e) =>
                  setPayment((prev) => ({ ...prev, depositor: e.target.value }))
                }
                placeholder="김명지"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-bold text-slate-700">
                입금 날짜*
              </div>
              <input
                value={payment.depositDate}
                onChange={(e) =>
                  setPayment((prev) => ({ ...prev, depositDate: e.target.value }))
                }
                placeholder="09/01"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block md:col-span-2">
              <div className="mb-1 text-sm font-bold text-slate-700">
                입금 금액*
              </div>
              <input
                value={payment.depositAmount}
                onChange={(e) =>
                  setPayment((prev) => ({
                    ...prev,
                    depositAmount: e.target.value,
                  }))
                }
                placeholder="32,500원"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <div className="mt-1 text-xs text-slate-500">
                물품비용, 배송비를 합산해 입력해주세요.
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : 1))}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          disabled={step === 1}
        >
          이전 페이지
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => {
              if (!stepValid) return;
              setStep((prev) => (prev + 1) as Step);
            }}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={!stepValid}
          >
            다음 페이지
          </button>
        ) : (
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={!stepValid}
          >
            신청 제출
          </button>
        )}
      </div>

      {!stepValid && (
        <div className="text-xs text-rose-600">
          필수 항목을 모두 입력하거나 선택해야 다음 단계로 이동할 수 있어요.
        </div>
      )}
    </form>
  );
}
