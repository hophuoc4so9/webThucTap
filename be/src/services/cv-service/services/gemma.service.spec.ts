import { RpcException } from "@nestjs/microservices";
import { GemmaService } from "./gemma.service";

describe("GemmaService", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  const baseCv = {
    id: 1,
    userId: 42,
    fullName: "Nguyen Van A",
    jobPosition: "Frontend Developer",
    phone: null,
    contactEmail: null,
    address: null,
    linkedIn: null,
    title: "Frontend Developer",
    summary: "",
    skills: '["React","TypeScript"]',
    education: null,
    experience: '["Intern Frontend"]',
    projects: null,
    filePath: null,
    fileOriginalName: null,
    fileMimeType: null,
    isDefault: false,
    source: "form",
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
    applications: [],
  };

  const restoreEnv = () => {
    process.env = originalEnv;
  };

  const setEnv = (overrides) => {
    restoreEnv();
    process.env = { ...originalEnv };
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    restoreEnv();
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    restoreEnv();
    globalThis.fetch = originalFetch;
  });

  it("throws an error when GEMMA_API_KEY is missing", async () => {
    setEnv({
      GEMMA_API_KEY: undefined,
      GEMMA_API_URL: undefined,
      GEMMA_MODEL_ID: undefined,
      GEMMA_THINKING_LEVEL: undefined,
      GEMMA_THINKING_MODE: undefined,
    });

    const service = new GemmaService();

    try {
      await service.suggestCvImprovements(baseCv);
      throw new Error("Expected GemmaService to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcException);
      expect(error.getError()).toMatchObject({
          statusCode: 503,
        message: "Gemma API key is missing; analysis cannot run.",
      });
    }
  });

  it("uses the API response when Gemma returns valid JSON", async () => {
    setEnv({
      GEMMA_API_KEY: "test-key",
      GEMMA_API_URL: "https://api.example.com/v1/chat/completions",
      GEMMA_MODEL_ID: "gemma-test",
      GEMMA_THINKING_LEVEL: "high",
      GEMMA_THINKING_MODE: "off",
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"score":91,"summary":"CV có dự án React rõ ràng","strengths":["Có React","Có TypeScript"],"improvements":[{"section":"skills","issue":"Thiếu testing","suggestion":"Thêm Jest và React Testing Library","priority":"medium"}],"keywordsToAdd":["testing","jest"],"recommendation":"revise-current-cv"}',
            },
          },
        ],
      }),
      text: async () => "",
    });
    globalThis.fetch = fetchMock;

    const service = new GemmaService();
    const result = await service.suggestCvImprovements(baseCv);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/v1/chat/completions");
    expect(result).toMatchObject({
      score: 91,
      summary: "CV có dự án React rõ ràng",
      strengths: ["Có React", "Có TypeScript"],
      recommendation: "revise-current-cv",
      keywordsToAdd: ["testing", "jest"],
    });
    expect(result.improvements).toEqual([
      {
        section: "skills",
        issue: "Thiếu testing",
        suggestion: "Thêm Jest và React Testing Library",
        priority: "medium",
      },
    ]);
  });

  it("parses JSON wrapped in markdown fences", async () => {
    setEnv({
      GEMMA_API_KEY: "test-key",
      GEMMA_API_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMMA_MODEL_ID: "gemma-test",
      GEMMA_THINKING_LEVEL: "high",
      GEMMA_THINKING_MODE: "off",
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: [
                    "Đây là kết quả:",
                    "```json",
                    '{"fitScore":88,"matchedSkills":["React"],"missingSkills":["Testing"],"missingKeywords":["Jest"],"recommendation":"revise-current-cv","explanation":"CV khớp tốt nhưng thiếu testing","actionPlan":["Bổ sung Jest"]}',
                    "```",
                  ].join("\n"),
                },
              ],
            },
          },
        ],
      }),
      text: async () => "",
    });
    globalThis.fetch = fetchMock;

    const service = new GemmaService();
    const result = await service.analyzeCvJobFit(baseCv, {
      title: "Senior Frontend Engineer",
      requirement: "React, TypeScript, testing, performance optimization",
      tagsRequirement: '["React","TypeScript","testing"]',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      fitScore: 88,
      matchedSkills: ["React"],
      missingSkills: ["Testing"],
      missingKeywords: ["Jest"],
      recommendation: "revise-current-cv",
      explanation: "CV khớp tốt nhưng thiếu testing",
    });
    expect(result.actionPlan).toEqual(["Bổ sung Jest"]);
  });

  it("parses JSON surrounded by extra explanatory text", async () => {
    setEnv({
      GEMMA_API_KEY: "test-key",
      GEMMA_API_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMMA_MODEL_ID: "gemma-test",
      GEMMA_THINKING_LEVEL: "high",
      GEMMA_THINKING_MODE: "off",
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Phân tích của tôi: {"score":77,"summary":"Tốt","strengths":["Có React"],"improvements":[],"keywordsToAdd":[],"recommendation":"revise-current-cv"} Lưu ý thêm: hãy cập nhật skills.',
                },
              ],
            },
          },
        ],
      }),
      text: async () => "",
    });
    globalThis.fetch = fetchMock;

    const service = new GemmaService();
    const result = await service.suggestCvImprovements(baseCv);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      score: 77,
      summary: "Tốt",
      strengths: ["Có React"],
      recommendation: "revise-current-cv",
    });
  });

  it("joins split text parts before parsing JSON", async () => {
    setEnv({
      GEMMA_API_KEY: "test-key",
      GEMMA_API_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMMA_MODEL_ID: "gemma-4-31b-it",
      GEMMA_THINKING_LEVEL: "low",
      GEMMA_THINKING_MODE: "off",
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Phân tích: ' },
                { text: '{"score":77,"summary":"Tốt","strengths":["Có React"],"improvements":[],"keywordsToAdd":[],"recommendation":"revise-current-cv"}' },
              ],
            },
          },
        ],
      }),
      text: async () => "",
    });
    globalThis.fetch = fetchMock;

    const service = new GemmaService();
    const result = await service.suggestCvImprovements(baseCv);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      score: 77,
      summary: "Tốt",
      strengths: ["Có React"],
      recommendation: "revise-current-cv",
    });
  });

  it("throws an error when the API response is not valid JSON", async () => {
    setEnv({
      GEMMA_API_KEY: "test-key",
      GEMMA_API_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMMA_MODEL_ID: "gemma-test",
      GEMMA_THINKING_LEVEL: "high",
      GEMMA_THINKING_MODE: "high",
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Giải thích dài nhưng không có object JSON hợp lệ" }],
            },
          },
        ],
      }),
      text: async () => "",
    });
    globalThis.fetch = fetchMock;

    const service = new GemmaService();

    try {
      await service.analyzeCvJobFit(baseCv, {
        title: "Senior Frontend Engineer",
        requirement: "React, TypeScript, testing, performance optimization",
        tagsRequirement: '["React","TypeScript","testing"]',
      });
      throw new Error("Expected GemmaService to throw");
    } catch (error) {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(RpcException);
      expect(error.getError()).toMatchObject({
          statusCode: 502,
        message: "Gemma API response is not valid JSON.",
      });
    }
  });
});