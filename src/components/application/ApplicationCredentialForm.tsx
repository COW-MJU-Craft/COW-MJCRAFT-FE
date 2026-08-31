type Props = {
  title: string;
  description?: string;
  studentId: string;
  password: string;
  loading?: boolean;
  buttonLabel: string;
  error?: string | null;
  onChangeStudentId: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
};

export default function ApplicationCredentialForm({
  title,
  description,
  studentId,
  password,
  loading = false,
  buttonLabel,
  error,
  onChangeStudentId,
  onChangePassword,
  onSubmit,
}: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700">학번</label>
          <input
            value={studentId}
            onChange={(e) => onChangeStudentId(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
      >
        {loading ? '처리 중...' : buttonLabel}
      </button>
    </form>
  );
}
