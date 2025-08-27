import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Transaction, AiReport, Entrepreneur, GrowthPlan, ContractData, DashboardInsight, ChatMessage, Resource, SuggestedResource, Goal } from '../types';
import { GENAI_MODEL_NAME } from '../constants';

const getApiKey = (): string | undefined => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    console.warn("process.env.API_KEY is not accessible.");
    return undefined;
  }
};

export const parseExpenseFromReceipt = async (imageBase64Data: string): Promise<Partial<Transaction>> => {
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

    return JSON.parse(response.text) as Partial<Transaction>;
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
                    recommendation: { type: Type.STRING, description: "The recommendation text." },
                    priority: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: "The priority of the recommendation." }
                },
                required: ['recommendation', 'priority']
            }
        }
    },
    required: ['reportTitle', 'executiveSummary', 'keyMetrics', 'incomeStatement', 'financialRatios', 'charts', 'swotAnalysis', 'detailedAnalysis', 'strategicRecommendations', 'cashFlowAnalysis', 'salesInsights', 'futureOutlook', 'riskAnalysis', 'varianceAnalysis', 'workingCapitalAnalysis']
  };

  const transactionLogs = transactions.length > 0
    ? transactions.map(t =>
        `- Date: ${t.date}, Type: ${t.type}, Amount: ${t.amount.toFixed(2)}, Category: ${t.productServiceCategory || 'Uncategorized'}, Status: ${t.paidStatus || 'N/A'}, Customer: ${t.customerName || 'N/A'}, Desc: ${t.description}`
      ).join('\n')
    : "No transactions were recorded for this period.";

  const goalsContext = (goals && goals.length > 0)
    ? `
    CRITICAL CONTEXT: The entrepreneur has set the following goals. Your analysis MUST incorporate these goals. Comment on their progress, celebrate achievements, and provide recommendations specifically related to these targets.
    - ${goals.map(g => `${g.title} (Type: ${g.type}, Target: ${g.targetValue}, Due: ${g.targetDate})`).join('\n- ')}
    `
    : "No specific goals have been set by the entrepreneur for this period.";

  const systemInstruction = `Act as a senior financial consultant from a top-tier firm like McKinsey, BCG, or Bain, preparing a confidential performance review for the Africa Entrepreneurship School (AES).
Your analysis must be formal, data-driven, and highly professional. Your tone should be objective and strategic, suitable for a board meeting.
You will receive client and transaction data. Based on this data, generate a comprehensive financial report in JSON format that STRICTLY follows the provided schema. You must generate all sections.
- **reportTitle**: Use a formal title like 'Confidential Financial Performance Review'.
- **executiveSummary**: A concise, formal summary for a C-suite audience, highlighting key findings and the overall financial health.
- **incomeStatement**: A formal 'Statement of Profit & Loss'.
- **varianceAnalysis**: This is critical. Analyze trends within the period. If monthly, compare the first half to the second. If yearly, compare quarters or halves. Discuss revenue velocity, expense trends, and business momentum.
- **workingCapitalAnalysis**: Provide a brief but insightful analysis of the business's liquidity. Comment on the relationship between net profit, cash from operations (inferred from transactions), and outstanding receivables (inferred from 'Pending' or 'Partial' income statuses).
- **riskAnalysis**: Identify 2-3 plausible business risks based on the data (e.g., customer concentration, negative cash flow). Assess impact and propose concrete mitigation strategies.
- **financialRatios**: Calculate at least two key ratios (e.g., Profit Margin, Expense Ratio). Provide the formula and a professional interpretation.
- **swotAnalysis**: Infer strengths, weaknesses, opportunities, and threats directly from the financial data provided.
- **detailedAnalysis**: Write deep-dive paragraphs on interesting patterns. If goals exist, one section MUST be titled "Performance Against Strategic Goals".
- **strategicRecommendations**: This is the 'Action Plan'. Provide 3-5 high-impact, strategic recommendations, not just simple tips. Prioritize them.`;

  const prompt = `
    Client: ${entrepreneur.name}, founder of "${entrepreneur.businessName}".
    Analysis Period: ${period}.

    ${goalsContext}

    Transaction Data:
    ${transactionLogs}
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: reportSchema,
            temperature: 0.4,
        }
    });

    return JSON.parse(response.text) as AiReport;

  } catch (error)
 {
    console.error("Error generating AI report with Gemini API:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
        throw new Error("Failed to generate report: The Gemini API key is not valid.");
    }
    throw new Error(`Failed to generate AI report. Error: ${err.message}`);
  }
};

export const generateDashboardInsights = async (
    entrepreneurs: Entrepreneur[],
    transactions: Transaction[]
): Promise<DashboardInsight[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API key not configured.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const insightSchema = {
        type: Type.OBJECT,
        properties: {
            insights: {
                type: Type.ARRAY,
                description: "A list of 3-4 diverse and interesting insights.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['milestone', 'warning', 'opportunity', 'trend'], description: "The category of the insight." },
                        title: { type: Type.STRING, description: "A short, catchy title for the insight." },
                        description: { type: Type.STRING, description: "A one-sentence explanation of the insight." },
                        icon: { type: Type.STRING, enum: ['🎉', '⚠️', '💡', '📉'], description: "An emoji that represents the insight type." },
                    },
                    required: ['type', 'title', 'description', 'icon']
                }
            }
        }
    };
    
    // Create a summarized, anonymized string of data to send
    const dataSummary = `
        Total Entrepreneurs: ${entrepreneurs.length}
        Total Transactions: ${transactions.length}
        Date Range: ${transactions.length > 0 ? new Date(transactions[0].date).toDateString() : 'N/A'} to ${transactions.length > 0 ? new Date(transactions[transactions.length - 1].date).toDateString() : 'N/A'}
        
        Example Transactions (latest 5):
        ${transactions.slice(-5).map(t => `- Entr. ID: ${t.entrepreneurId.substring(0,5)}, Type: ${t.type}, Amount: ${t.amount}`).join('\n')}
        
        Entrepreneur Summaries:
        ${entrepreneurs.map(e => `- Entr. ID: ${e.id.substring(0,5)}, Business: ${e.businessName}, Start Date: ${e.startDate}, Goals: ${e.goals?.length || 0}`).join('\n')}
    `;

    const prompt = `
        As an expert business analyst, review the following summary of business data for a portfolio of small entrepreneurs. 
        Your task is to identify up to 4 high-level, interesting, and actionable insights. 
        Focus on collective trends, significant achievements, or potential risks that an admin overseeing these businesses should be aware of.
        Do not focus on just one entrepreneur unless there is a very significant outlier.
        Provide a diverse mix of insight types (milestone, warning, opportunity, trend).
        
        Data Summary:
        ${dataSummary}

        Generate a JSON object that strictly follows the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: insightSchema,
                temperature: 0.7,
            }
        });

        const result = JSON.parse(response.text) as { insights: DashboardInsight[] };
        return result.insights || [];

    } catch (error) {
        console.error("Error generating dashboard insights:", error);
        throw new Error("Failed to generate AI insights.");
    }
};


export const queryDataWithAi = async (
    query: string,
    entrepreneurs: Entrepreneur[],
    transactions: Transaction[],
    chatHistory: ChatMessage[]
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API key not configured.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const dataContext = `
        Here is the data context for the user's query.
        Total Entrepreneurs: ${entrepreneurs.length}
        Total Transactions: ${transactions.length}
        
        Entrepreneurs Data (JSON):
        ${JSON.stringify(entrepreneurs.map(e => ({id: e.id, name: e.name, businessName: e.businessName, startDate: e.startDate, goals: e.goals?.length || 0})), null, 2)}
        
        Transactions Data (first 50, JSON):
        ${JSON.stringify(transactions.slice(0, 50), null, 2)}
    `;

    // Format chat history for the model
    const history = chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    
    const prompt = `
        You are Aida, a helpful and friendly AI data assistant for the AES JAC Admin Portal.
        Your role is to answer questions about the provided business data.
        Be concise, clear, and friendly in your responses. If the data is insufficient to answer, say so politely.
        Use markdown for formatting like lists or bold text if it improves readability.
        
        ${dataContext}

        Chat History:
        ${history}

        New User Query:
        user: ${query}
        ai: 
    `;

    try {
        const response = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 500,
                thinkingConfig: { thinkingBudget: 0 } // Low latency for chat
            }
        });
        
        return response.text;

    } catch (error) {
        console.error("Error querying data with AI:", error);
        throw new Error("The AI assistant could not process your request.");
    }
};


export const generateGrowthPlan = async (
    businessProfile: string,
    needsAssessment: string,
    entrepreneurName: string,
    availableResources: Resource[]
): Promise<GrowthPlan> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey });

    const growthPlanSchema = {
        type: Type.OBJECT,
        properties: {
            executiveSummary: { type: Type.STRING, description: `A 2-3 sentence strategic summary for ${entrepreneurName}.` },
            strategicRecommendations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A catchy title for the recommendation." },
                        recommendation: { type: Type.STRING, description: "A detailed, actionable recommendation." },
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
                        documentName: { type: Type.STRING, description: "e.g., 'Partnership Agreement', 'Service Contract'" },
                        description: { type: Type.STRING, description: "Why this document is needed." },
                        contractType: { type: Type.STRING, enum: ['PARTNERSHIP_AGREEMENT', 'SERVICE_CONTRACT', 'EMPLOYMENT_CONTRACT', 'NON_DISCLOSURE_AGREEMENT'] }
                    },
                    required: ['documentName', 'description', 'contractType']
                }
            },
            suggestedResources: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "The exact title of a resource from the provided list." },
                        reason: { type: Type.STRING, description: `Why this specific resource is useful for ${entrepreneurName}.` }
                    },
                    required: ['title', 'reason']
                }
            }
        },
        required: ['executiveSummary', 'strategicRecommendations', 'suggestedDocuments', 'suggestedResources']
    };
    
    const resourceList = availableResources.map(r => `- Title: "${r.title}", Tags: [${r.tags.join(', ')}]`).join('\n');

    const prompt = `
        Act as a master business strategist for the Africa Entrepreneurship School.
        Your client is ${entrepreneurName}.
        
        Business Profile:
        ${businessProfile}
        
        Stated Needs & Challenges:
        ${needsAssessment}

        Available learning resources:
        ${resourceList}
        
        Based on all the above information, create a strategic growth plan.
        1. Write a concise executive summary.
        2. Provide 3-4 high-priority, actionable strategic recommendations.
        3. Based on the needs, suggest 1-2 relevant legal or business documents that might be necessary.
        4. From the list of available learning resources, select the 2 most relevant resources and explain why they are a good fit. You must only choose from the titles provided.
        
        Generate the output as a JSON object adhering strictly to the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: growthPlanSchema,
            }
        });
        return JSON.parse(response.text) as GrowthPlan;
    } catch (error) {
        console.error("Error generating growth plan:", error);
        throw new Error("Failed to generate the AI growth plan.");
    }
};

export const generateContract = async (
    contractType: string,
    businessProfile: string
): Promise<ContractData> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey });
    
    const contractSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The full title of the legal document." },
            clauses: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "The title of the clause, e.g., '1. Parties'" },
                        content: { type: Type.STRING, description: "The full text content of the clause. Use placeholders like '[Your Company Name]' or '[Partner Name]'." }
                    },
                    required: ['title', 'content']
                }
            }
        },
        required: ['title', 'clauses']
    };

    const prompt = `
        Act as an AI legal assistant.
        Your task is to generate a standard, editable draft of a common business document.
        The document type required is: ${contractType}.
        The business it is for is described as: ${businessProfile}.
        
        Generate a basic, standard template for this document. Use clear placeholders like [Your Name/Company], [Partner's Name], [Date], [Address], etc., where specific details are needed.
        The output must be a JSON object that strictly follows the provided schema, containing a title and an array of clauses.
    `;
    
     try {
        const response = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: contractSchema,
            }
        });
        return JSON.parse(response.text) as ContractData;
    } catch (error) {
        console.error("Error generating contract:", error);
        throw new Error("Failed to generate the AI document draft.");
    }
};