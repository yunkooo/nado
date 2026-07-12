import { MobileTokenParityDemoScreen } from "./src/features/design/MobileTokenParityDemoScreen";
import { NadoApp } from "./App";

export default function DesignDemoApp() {
  return <NadoApp designDemoContent={<MobileTokenParityDemoScreen />} />;
}
