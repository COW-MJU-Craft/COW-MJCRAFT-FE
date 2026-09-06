import type {
  AdminApplicationAnswerItem,
  AdminApplicationDetail,
  AdminApplicationResultStatus,
} from '../../../api/admin/applications';
import type { AdminFormQuestion } from '../../../api/admin/forms';
import { formatYmd, parseDateLike } from '../../../utils/common/date';
import { getDepartmentLabel } from '../../../types/recruit';

type AdminApplicationPrintDocumentProps = {
  detail: AdminApplicationDetail;
  questionMap: Record<number, AdminFormQuestion>;
  formTitle?: string;
  index?: number;
  total?: number;
};

const RESULT_LABELS: Record<AdminApplicationResultStatus, string> = {
  NOT_PUBLISHED: '미발표',
  PASS: '합격',
  FAIL: '불합격',
};

function getDateLabel(detail: AdminApplicationDetail) {
  const date = parseDateLike(detail.createdAt ?? detail.updatedAt);
  return date ? formatYmd(date) : '-';
}

function getQuestionLabel(
  questionMap: Record<number, AdminFormQuestion>,
  formQuestionId: number,
) {
  const question = questionMap[formQuestionId];
  return question?.label?.trim() || '질문';
}

function getQuestionAnswerType(
  questionMap: Record<number, AdminFormQuestion>,
  formQuestionId: number,
) {
  return (questionMap[formQuestionId]?.answerType ?? '').toUpperCase();
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isLikelyFileKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isLikelyUrl(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  return (
    /^uploads\/recruit\/answers\/.+/i.test(trimmed) ||
    /\.(pdf|docx?|pptx?|xlsx?|zip|hwp|png|jpe?g|webp)$/i.test(trimmed)
  );
}

function getDisplayFileName(answer: AdminApplicationAnswerItem) {
  const fromServer = answer.fileName?.trim();
  if (fromServer) return fromServer;

  const value = answer.value?.trim() ?? '';
  if (!value) return '첨부 파일';
  if (isLikelyUrl(value)) return value;

  const lastSegment = value.split('/').filter(Boolean).pop() ?? value;
  return lastSegment.replace(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/,
    '',
  );
}

function isFileAnswer(
  answer: AdminApplicationAnswerItem,
  questionMap: Record<number, AdminFormQuestion>,
) {
  const value = answer.value?.trim() ?? '';
  const answerType = getQuestionAnswerType(questionMap, answer.formQuestionId);
  return (
    answerType.includes('FILE') ||
    isLikelyUrl(value) ||
    isLikelyFileKey(value) ||
    Boolean(answer.fileUrl || answer.previewUrl || answer.downloadUrl)
  );
}

function PrintAnswer({
  answer,
  questionMap,
}: {
  answer: AdminApplicationAnswerItem;
  questionMap: Record<number, AdminFormQuestion>;
}) {
  const value = answer.value?.trim() ?? '';
  const fileAnswer = isFileAnswer(answer, questionMap);
  const fileUrl = (
    answer.downloadUrl ??
    answer.previewUrl ??
    answer.fileUrl ??
    ''
  ).trim();
  const displayFileName = getDisplayFileName(answer);

  return (
    <div className="application-print-answer">
      <div className="application-print-question">
        {getQuestionLabel(questionMap, answer.formQuestionId)}
      </div>
      {fileAnswer ? (
        <div className="application-print-file">
          <span>{displayFileName}</span>
          {fileUrl && <span className="application-print-file-url">{fileUrl}</span>}
        </div>
      ) : (
        <div className="application-print-value">
          {value || '응답 없음'}
        </div>
      )}
    </div>
  );
}

function PrintSection({
  title,
  answers,
  questionMap,
}: {
  title: string;
  answers?: AdminApplicationAnswerItem[];
  questionMap: Record<number, AdminFormQuestion>;
}) {
  return (
    <section className="application-print-section">
      <h2>{title}</h2>
      {answers && answers.length > 0 ? (
        <div className="application-print-answer-list">
          {answers.map((answer) => (
            <PrintAnswer
              key={`${title}-${answer.formQuestionId}`}
              answer={answer}
              questionMap={questionMap}
            />
          ))}
        </div>
      ) : (
        <p className="application-print-empty">응답 없음</p>
      )}
    </section>
  );
}

export default function AdminApplicationPrintDocument({
  detail,
  questionMap,
  formTitle,
  index,
  total,
}: AdminApplicationPrintDocumentProps) {
  const applicantName = detail.applicantName?.trim() || '이름 없음';
  const dateLabel = getDateLabel(detail);
  const positionLabel =
    typeof index === 'number' && typeof total === 'number'
      ? `${index + 1} / ${total}`
      : null;

  return (
    <article className="application-print-doc">
      <header className="application-print-header">
        <div>
          <p className="application-print-eyebrow">
            {formTitle || '신규부원 지원서'}
          </p>
          <h1>{applicantName}</h1>
        </div>
        {positionLabel && (
          <div className="application-print-count">{positionLabel}</div>
        )}
      </header>

      <dl className="application-print-meta">
        <div>
          <dt>학번</dt>
          <dd>{detail.studentId}</dd>
        </div>
        <div>
          <dt>접수일</dt>
          <dd>{dateLabel}</dd>
        </div>
        <div>
          <dt>1지망</dt>
          <dd>{getDepartmentLabel(detail.firstDepartment)}</dd>
        </div>
        <div>
          <dt>2지망</dt>
          <dd>{getDepartmentLabel(detail.secondDepartment)}</dd>
        </div>
        <div>
          <dt>결과</dt>
          <dd>{RESULT_LABELS[detail.resultStatus] ?? detail.resultStatus}</dd>
        </div>
      </dl>

      <PrintSection
        title="기본 정보"
        answers={detail.basicAnswers}
        questionMap={questionMap}
      />
      <PrintSection
        title="공통 질문"
        answers={detail.commonAnswers}
        questionMap={questionMap}
      />
      <PrintSection
        title="1지망 질문"
        answers={detail.firstDepartmentAnswers}
        questionMap={questionMap}
      />
      <PrintSection
        title="2지망 질문"
        answers={detail.secondDepartmentAnswers}
        questionMap={questionMap}
      />
    </article>
  );
}
