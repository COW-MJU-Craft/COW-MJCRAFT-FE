import { useEffect, useState } from 'react';
import { getDeploymentVersion } from '../../utils/common/deploymentVersion';

export default function DeploymentVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadVersion = async () => {
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;

        const nextVersion = getDeploymentVersion(await response.json());
        if (!cancelled) setVersion(nextVersion);
      } catch {
        // 로컬 개발이나 배포 전 환경에는 version.json이 없을 수 있다.
      }
    };

    void loadVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!version) return null;

  return (
    <output
      className="fixed bottom-2 right-2 z-40 rounded border border-slate-200 bg-white/90 px-2 py-1 font-mono text-[10px] font-medium text-slate-500 shadow-sm backdrop-blur"
      title={`배포 커밋 ${version}`}
      aria-label={`배포 버전 ${version}`}
    >
      build {version}
    </output>
  );
}
