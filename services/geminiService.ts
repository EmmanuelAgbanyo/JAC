import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Transaction, AiReport, Entrepreneur, GrowthPlan, ContractData, DashboardInsight, ChatMessage, Resource, SuggestedResource, Goal, PartialTransaction } from '../types';
import { GENAI_MODEL_NAME } from '../constants';

const getApiKey = (): string | undefined => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    console.warn("process.env.API_KEY is not accessible.");
    return undefined;
  }
};

export const parseExpenseFromReceipt = async (imageBase64Data: string): Promise<PartialTransaction> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot parse receipt.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const expenseSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING, description: "The name of the vendor or store from the receipt." },
        date: { type: Type.STRING, description: "The date of the transaction in YYYY-MM-DD format." },
        amount: { type: Type.NUMBER, description: "The final total amount of the transaction as a number." },
        productServiceCategory: {
            type: Type.STRING,
            description: "A suggested category for the expense based on the vendor and items. Examples: 'Office Supplies', 'Fuel', 'Travel', 'Meals & Entertainment', 'Utilities', 'Maintenance', 'Groceries', 'Other'."
        },
    },
    required: ['date', 'description', 'amount']
  };

  const prompt = `
    Analyze the provided receipt image. Your task is to extract the key information for an expense report.
    Identify the vendor's name, the transaction date, and the final total amount.
    Based on the vendor name and items on the receipt, suggest a suitable expense category.
    Return the information in a JSON object that strictly adheres to the provided schema.
    If any piece of information is unclear, make a reasonable guess or leave it out if not required by the schema.
    The final amount should be the grand total, including any taxes or tips.
  `;
  
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBase64Data,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: expenseSchema,
        temperature: 0.1,
      }
    });

    return JSON.parse(response.text) as PartialTransaction;
  } catch (error) {
    console.error("Error parsing receipt with Gemini API:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
        throw new Error("Failed to parse receipt: The Gemini API key is not valid.");
    }
    throw new Error(`The AI could not read this receipt. Please check the image quality or enter the details manually. Error: ${err.message}`);
  }
};


export const parseTransactionsFromPdf = async (pdfBase64Data: string): Promise<{ transactions: any[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot parse PDF.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const transactionExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        transactions: {
            type: Type.ARRAY,
            description: "A list of all financial transactions found in the document.",
            items: {
                type: Type.OBJECT,
                properties: {
                    entrepreneurName: { type: Type.STRING, description: "Full name of the entrepreneur, if available from context." },
                    businessName: { type: Type.STRING, description: "Name of the business associated with the transaction, if available from context." },
                    date: { type: Type.STRING, description: "Date of the transaction in YYYY-MM-DD format. Infer the year if missing." },
                    description: { type: Type.STRING, description: "A detailed description of the transaction." },
                    amount: { type: Type.NUMBER, description: "The transaction amount as a number." },
                    type: { type: Type.STRING, enum: ['Income', 'Expense'], description: "The type of transaction." },
                },
                required: ['date', 'description', 'amount', 'type']
            }
        }
    }
  };

  const prompt = `
    Analyze the provided PDF document which contains financial records.
    Extract all individual transactions you can find. For each transaction, identify the date, a description, the amount, and the type (Income or Expense).
    Also, identify the name of the entrepreneur or the business name associated with each transaction if possible from the document's context (e.g., from a header or title).
    Return the data as a JSON object that strictly adheres to the provided schema. Pay close attention to data types, especially for the amount (number) and date (YYYY-MM-DD). If a date is ambiguous or the year is missing, use your best judgment to format it correctly based on context. If a transaction lacks an entrepreneur or business name, leave those fields null.
  `;
  
  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: pdfBase64Data,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: GENAI_MODEL_NAME, // Assumes a model that can handle PDF, like 1.5 Pro
      contents: { parts: [pdfPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: transactionExtractionSchema,
        temperature: 0.1,
      }
    });

    return JSON.parse(response.text) as { transactions: any[] };

  } catch (error) {
    console.error("Error parsing PDF with Gemini API:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
        throw new Error("Failed to parse PDF: The Gemini API key is not valid.");
    }
    throw new Error(`Failed to parse PDF with AI. Error: ${err.message}`);
  }
};


export const generateAiPoweredReport = async (
  transactions: Transaction[],
  entrepreneur: Entrepreneur,
  period: string,
  goals?: Goal[]
): Promise<AiReport> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot generate AI report.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const reportSchema = {
    type: Type.OBJECT,
    properties: {
        reportTitle: { type: Type.STRING, description: "A compelling title for the report, e.g., 'Confidential Financial Performance Review'." },
        executiveSummary: { type: Type.STRING, description: "A concise, 3-4 sentence summary of the overall performance, written in a formal, professional tone for a C-suite audience." },
        keyMetrics: {
            type: Type.ARRAY,
            description: "An array of 4-6 key financial metrics.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the metric (e.g., 'Total Revenue', 'Net Profit')." },
                    value: { type: Type.STRING, description: "The value of the metric, formatted as a string (e.g., 'GHS 1,500.00')." },
                    insight: { type: Type.STRING, description: "A brief, one-sentence insight explaining the metric's importance or context." },
                    sentiment: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'], description: "The sentiment of the metric's value."}
                },
                required: ['metric', 'value', 'insight', 'sentiment']
            }
        },
        incomeStatement: {
            type: Type.OBJECT,
            description: "A simple income statement (Profit & Loss).",
            properties: {
                title: { type: Type.STRING, description: "e.g., 'Statement of Profit & Loss'" },
                lines: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            item: { type: Type.STRING },
                            amount: { type: Type.STRING }
                        },
                        required: ['item', 'amount']
                    }
                },
                final_net_income: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING, description: "e.g., 'Net Profit / (Loss)'" },
                        value: { type: Type.STRING, description: "The final calculated value." },
                        sentiment: { type: Type.STRING, enum: ['positive', 'negative', 'neutral']}
                    },
                    required: ['label', 'value', 'sentiment']
                }
            },
            required: ['title', 'lines', 'final_net_income']
        },
        varianceAnalysis: {
            type: Type.OBJECT,
            description: "An analysis of performance variance within the period.",
            properties: {
                title: { type: Type.STRING, description: "e.g., 'Intra-Period Variance Analysis'" },
                analysis: { type: Type.STRING, description: "A paragraph analyzing performance trends within the period (e.g., comparing first half to second half). Comment on revenue velocity, cost control, and momentum." }
            },
            required: ['title', 'analysis']
        },
        workingCapitalAnalysis: {
            type: Type.OBJECT,
            description: "An analysis of liquidity and working capital.",
            properties: {
                title: { type: Type.STRING, description: "e.g., 'Working Capital & Liquidity Analysis'"},
                analysis: { type: Type.STRING, description: "A paragraph analyzing the business's short-term financial health. Comment on the relationship between net income, cash-generating activities, and outstanding receivables (inferred from pending payments)."}
            },
            required: ['title', 'analysis']
        },
        cashFlowAnalysis: {
            type: Type.OBJECT,
            description: "An analysis of cash flow.",
            properties: {
                title: { type: Type.STRING },
                analysis: { type: Type.STRING, description: "A paragraph explaining cash flow vs profit and analyzing the cash flow for the period." }
            },
            required: ['title', 'analysis']
        },
        salesInsights: {
            type: Type.OBJECT,
            description: "Insights on top customers and products.",
            properties: {
                title: { type: Type.STRING },
                top_customers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Customer's name." },
                            value: { type: Type.STRING, description: "Total revenue from customer, formatted." },
                            count: { type: Type.NUMBER, description: "Number of transactions." }
                        },
                        required: ['name', 'value']
                    }
                },
                top_products: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Product/Service category name." },
                            value: { type: Type.STRING, description: "Total revenue from product, formatted." },
                            count: { type: Type.NUMBER, description: "Number of units/transactions." }
                        },
                        required: ['name', 'value']
                    }
                }
            },
            required: ['title', 'top_customers', 'top_products']
        },
        futureOutlook: {
            type: Type.OBJECT,
            description: "A forward-looking forecast and trends to watch.",
            properties: {
                title: { type: Type.STRING },
                forecast: { type: Type.STRING, description: "A qualitative forecast for the next period." },
                trends_to_watch: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "A list of 2-3 key strategic trends to monitor."
                }
            },
            required: ['title', 'forecast', 'trends_to_watch']
        },
        riskAnalysis: {
            type: Type.OBJECT,
            description: "Analysis of key business risks and mitigation.",
            properties: {
                title: { type: Type.STRING },
                risks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            risk: { type: Type.STRING, description: "A description of the identified risk." },
                            impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The potential impact of the risk." },
                            mitigation: { type: Type.STRING, description: "A suggested strategy to mitigate the risk."}
                        },
                        required: ['risk', 'impact', 'mitigation']
                    }
                }
            },
            required: ['title', 'risks']
        },
        financialRatios: {
            type: Type.ARRAY,
            description: "An array of 2-3 important financial ratios.",
            items: {
                type: Type.OBJECT,
                properties: {
                    ratio_name: { type: Type.STRING, description: "e.g., 'Profit Margin'" },
                    value: { type: Type.STRING, description: "e.g., '25.5%'"},
                    formula: { type: Type.STRING, description: "e.g., '(Net Income / Revenue) * 100'" },
                    interpretation: { type: Type.STRING, description: "A brief explanation of what this ratio means for the business." }
                },
                required: ['ratio_name', 'value', 'formula', 'interpretation']
            }
        },
        charts: {
            type: Type.ARRAY,
            description: "An array of 1-2 suggested data visualizations.",
            items: {
                type: Type.OBJECT,
                properties: {
                    chart_type: { type: Type.STRING, enum: ['bar', 'pie', 'line'], description: "The suggested type of chart." },
                    title: { type: Type.STRING, description: "The title for the chart." },
                    data: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "The label for the data point (e.g., a category name)." },
                                value: { type: Type.NUMBER, description: "The numerical value for the data point." }
                            },
                             required: ['name', 'value']
                        }
                    }
                },
                required: ['chart_type', 'title', 'data']
            }
        },
        swotAnalysis: {
            type: Type.OBJECT,
            description: "A SWOT analysis based on the financial data.",
            properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                threats: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['strengths', 'weaknesses', 'opportunities', 'threats']
        },
        detailedAnalysis: {
            type: Type.ARRAY,
            description: "An array of 2-3 detailed analysis sections.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the analysis section (e.g., 'Income Stream Analysis')." },
                    analysis: { type: Type.STRING, description: "A paragraph analyzing a specific aspect of the business performance." }
                },
                required: ['title', 'analysis']
            }
        },
        strategicRecommendations: {
             type: Type.ARRAY,
             description: "An array of 3-5 concrete, actionable steps for the entrepreneur.",
            items: {
                type: Type.OBJECT,
                properties: {
                    recommendation: { type: Type.STRING, description: "The actionable advice for the entrepreneur." },
                    priority: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: "The priority of the recommendation."}
                },
                required: ['recommendation', 'priority']
            }
        }
    },
    required: ['reportTitle', 'executiveSummary', 'keyMetrics', 'incomeStatement', 'cashFlowAnalysis', 'detailedAnalysis', 'strategicRecommendations']
  };

  const prompt = `
    Act as a professional financial analyst for a small business consultancy.
    Your client is ${entrepreneur.name}, owner of ${entrepreneur.businessName}.
    You are provided with their transaction data for the period: ${period}.
    You are also provided with their business bio and goals.

    Data:
    - Transactions: ${transactions.length > 0 ? JSON.stringify(transactions, null, 2) : "No transactions recorded for this period."}
    - Entrepreneur Bio: ${entrepreneur.bio || 'Not provided'}
    - Stated Goals: ${goals && goals.length > 0 ? JSON.stringify(goals, null, 2) : 'No specific goals provided for this period.'}

    Your task is to generate a comprehensive, professional, and insightful financial performance report.
    The tone should be formal, encouraging, and highly analytical.
    Produce a JSON object that strictly adheres to the provided schema.
    Ensure all financial values are formatted correctly as strings (e.g., 'GHS 1,234.56' or '25.5%').
    The analysis should be deep and tailored to the provided data. Do not use placeholder text. If data is sparse, analyze the implications of that.
    For the SWOT analysis, infer strengths, weaknesses, opportunities, and threats directly from the financial data (e.g., high profit margin is a strength, high expenses are a weakness, a new top customer is an opportunity, reliance on one customer is a threat).
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.3,
      }
    });

    return JSON.parse(response.text) as AiReport;

  } catch (error) {
    console.error("Error generating AI report with Gemini API:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
        throw new Error("Failed to generate report: The Gemini API key is not valid.");
    }
    throw new Error(`The AI failed to generate the report. This may be due to the data provided or an issue with the service. Please try again. Error: ${err.message}`);
  }
};

export const generateGrowthPlan = async (
    businessProfile: string,
    needsAssessment: string,
    entrepreneurName: string,
    availableResources: Resource[]
): Promise<GrowthPlan> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not configured.");
    const ai = new GoogleGenAI({ apiKey });

    const growthPlanSchema = {
        type: Type.OBJECT,
        properties: {
            executiveSummary: { type: Type.STRING },
            strategicRecommendations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        recommendation: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                    },
                    required: ['title', 'recommendation', 'priority']
                }
            },
            suggestedDocuments: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        documentName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        contractType: { type: Type.STRING, description: "A generic type for the contract generator, e.g., 'Partnership Agreement', 'Service Contract', 'Employment Agreement'." }
                    },
                    required: ['documentName', 'description', 'contractType']
                }
            },
            suggestedResources: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    },
                    required: ['title', 'reason']
                }
            }
        },
        required: ['executiveSummary', 'strategicRecommendations', 'suggestedDocuments']
    };

    const prompt = `
        Act as a senior business strategist for an entrepreneur named ${entrepreneurName}.
        Analyze the following business profile and needs assessment.
        
        Business Profile:
        ${businessProfile}

        Needs Assessment:
        ${needsAssessment}

        Your task is to create a strategic growth plan.
        1.  Write a concise executive summary of the plan.
        2.  Provide 3-5 high-level strategic recommendations with a title, detailed recommendation, and priority.
        3.  Suggest 2-3 essential business or legal documents that would be beneficial. For each, provide a name, a description of why it's needed, and a generic 'contractType' for an AI drafter.
        4.  From the list of available resources provided below, select 2-3 of the MOST RELEVANT resources and explain briefly why each is recommended. List them under 'suggestedResources'.
        
        Available Resources:
        ${JSON.stringify(availableResources.map(r => r.title))}

        Generate a JSON object that strictly adheres to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: growthPlanSchema,
            temperature: 0.5,
        }
    });

    return JSON.parse(response.text) as GrowthPlan;
};

export const generateContract = async (contractType: string, businessProfile: string): Promise<ContractData> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not configured.");
    const ai = new GoogleGenAI({ apiKey });

    const contractSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The official title of the legal document." },
            clauses: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "The title of the clause, e.g., '1. Parties', '2. Scope of Work'." },
                        content: { type: Type.STRING, description: "The full text of the clause. Use placeholders like '[Your Name/Company]', '[Client Name/Company]', '[Date]', etc." }
                    },
                    required: ['title', 'content']
                }
            }
        },
        required: ['title', 'clauses']
    };

    const prompt = `
        Act as an AI legal assistant. Your task is to generate a draft for a standard business contract.
        IMPORTANT: This is a template and not legal advice. The user must consult a qualified lawyer.

        Contract Type to Generate: ${contractType}
        Business Profile for Context:
        ${businessProfile}

        Instructions:
        1.  Generate a standard, simple ${contractType}.
        2.  The title should be formal and clear.
        3.  Create several logical clauses (e.g., Parties, Services, Payment, Term, Confidentiality, Governing Law).
        4.  The content of each clause should be standard boilerplate text for such a contract. Use placeholders like '[Your Company Name]', '[Client Name]', '[Start Date]', '[Amount]', '[Jurisdiction]' where appropriate.
        5.  Do NOT include a signature section in the clauses.
        6.  The final output must be a JSON object that strictly adheres to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: contractSchema,
            temperature: 0.3,
        }
    });

    return JSON.parse(response.text) as ContractData;
};

export const generateDashboardInsights = async (entrepreneurs: Entrepreneur[], transactions: Transaction[]): Promise<DashboardInsight[]> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not configured.");
    const ai = new GoogleGenAI({ apiKey });

    const insightsSchema = {
        type: Type.OBJECT,
        properties: {
            insights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['milestone', 'warning', 'opportunity', 'trend'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        icon: { type: Type.STRING, enum: ['🎉', '⚠️', '💡', '📉'] },
                        relatedEntrepreneurIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['type', 'title', 'description', 'icon']
                }
            }
        },
        required: ['insights']
    };

    // Prepare a summary of the data to keep the prompt concise
    const dataSummary = {
        totalEntrepreneurs: entrepreneurs.length,
        totalTransactions: transactions.length,
        totalIncome: transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0),
        totalExpense: transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0),
        entrepreneurPerformance: entrepreneurs.map(e => ({
            id: e.id,
            name: e.businessName,
            income: transactions.filter(t => t.entrepreneurId === e.id && t.type === 'Income').reduce((s, t) => s + t.amount, 0),
            expense: transactions.filter(t => t.entrepreneurId === e.id && t.type === 'Expense').reduce((s, t) => s + t.amount, 0),
            transactionCount: transactions.filter(t => t.entrepreneurId === e.id).length
        })).sort((a,b) => b.income - a.income)
    };

    const prompt = `
        Act as an AI business analyst reviewing dashboard data for a portfolio of small businesses.
        Analyze the provided data summary and generate 2-4 high-level insights.
        
        Data Summary:
        ${JSON.stringify(dataSummary)}

        Instructions:
        - Identify significant events or patterns. Examples: a business having exceptionally high income (milestone), a business with expenses far exceeding income (warning), a new entrepreneur showing rapid growth (opportunity), or a general trend across all businesses.
        - For each insight, provide a clear title and a concise description.
        - Choose the appropriate type and icon.
        - If the insight relates to specific entrepreneurs, include their IDs.
        - Be concise and impactful. Do not state the obvious. Find the story in the data.
        - If there's nothing particularly noteworthy, return an empty array of insights.

        Generate a JSON object that strictly adheres to the schema. The root key must be 'insights'.
    `;

    const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: insightsSchema,
            temperature: 0.6,
        }
    });
    
    const result = JSON.parse(response.text) as { insights: DashboardInsight[] };
    return result.insights || [];
};

export const queryDataWithAi = async (
    query: string,
    entrepreneurs: Entrepreneur[],
    transactions: Transaction[],
    chatHistory: ChatMessage[]
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not configured.");
    const ai = new GoogleGenAI({ apiKey });

    // Prepare a summary of the data to keep the prompt concise
    const dataSummary = {
        entrepreneurs: entrepreneurs.map(e => ({ id: e.id, name: e.name, businessName: e.businessName, startDate: e.startDate })),
        transactions: transactions.map(t => ({
            entrepreneurId: t.entrepreneurId,
            type: t.type,
            date: t.date,
            description: t.description,
            amount: t.amount
        }))
    };
    
    const contents = chatHistory.map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    const systemInstruction = `
        You are Aida, a friendly and helpful AI data assistant for the AES JAC Admin Portal.
        Your goal is to answer questions based on the provided JSON data about entrepreneurs and their transactions.
        - Analyze the data to answer the user's question.
        - Be conversational and clear in your responses.
        - If the data is insufficient to answer, say so politely.
        - Do not invent data. Base your answers strictly on the provided JSON.
        - You can perform calculations like sums, averages, and comparisons.
        - Today's date is ${new Date().toDateString()}.
        - The currency is Ghanaian Cedis (GHS).

        Here is the data available for your analysis:
        ${JSON.stringify(dataSummary)}
    `;

    const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return response.text;
};