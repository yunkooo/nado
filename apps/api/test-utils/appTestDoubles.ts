export const analysisService = {
  analyze: async () => ({
    reason: "not used in vocabulary route tests",
    status: "not_analyzable" as const,
  }),
};

export const analysisUsageService = {
  consume: async () => ({
    limit: null,
    ok: true as const,
    remaining: null,
    used: 1,
  }),
};
