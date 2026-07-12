import { analysisStyles } from "./analysisStyles";
import { appStyles } from "./appStyles";
import { designStyles } from "./designStyles";
import { studyStyles } from "./studyStyles";

export {
  mobileButtonTokens,
  mobileColors,
  mobileRadius,
  mobileReviewCardTokens,
  mobileSpacing,
  mobileTypography,
} from "./mobileTokens";

export const styles = {
  ...appStyles,
  ...analysisStyles,
  ...studyStyles,
  ...designStyles,
} as const;
