import { AppShell } from "./components/layout/AppShell";
import { FirmBriefing } from "./components/mobile/FirmBriefing";
import { MOCK_REPORT, MOCK_RECOMMENDATION, MOCK_SESSION } from "./data/mock";
import { useMediaQuery } from "./hooks/useMediaQuery";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <FirmBriefing
        report={MOCK_REPORT}
        recommendation={MOCK_RECOMMENDATION}
      />
    );
  }

  return (
    <AppShell
      report={MOCK_REPORT}
      recommendation={MOCK_RECOMMENDATION}
      session={MOCK_SESSION}
    />
  );
}
