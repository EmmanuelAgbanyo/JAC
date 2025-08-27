
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Transaction, AiReport, Entrepreneur, GrowthPlan, ContractData, DashboardInsight, ChatMessage, Resource, SuggestedResource } from '../types';
import { GENAI_MODEL_NAME } from '../constants';

const getApiKey = (): string | undefined => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    console.warn("process.env.API_KEY is not accessible.");
    return undefined;
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
  period: string
): Promise<AiReport> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot generate AI report.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const reportSchema = {
    type: Type.OBJECT,
    properties: {
        reportTitle: { type: Type.STRING, description: "A compelling title for the report." },
        executiveSummary: { type: Type.STRING, description: "A concise, 2-3 sentence summary of the overall performance." },
        keyMetrics: {
            type: Type.ARRAY,
            description: "An array of 4-6 key financial metrics.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the metric (e.g., 'Total Revenue', 'Net Profit')." },
                    value: { type: Type.STRING, description: "The value of the metric, formatted as a string (e.g., 'GHS 1500.00')." },
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
                title: { type: Type.STRING, description: "Title for the income statement section." },
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
                        label: { type: Type.STRING, description: "e.g., 'Net Income'" },
                        value: { type: Type.STRING, description: "The final calculated value." },
                        sentiment: { type: Type.STRING, enum: ['positive', 'negative', 'neutral']}
                    },
                    required: ['label', 'value', 'sentiment']
                }
            },
            required: ['title', 'lines', 'final_net_income']
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
        actionableRecommendations: {
             type: Type.ARRAY,
             description: "An array of 3-5 concrete, actionable steps for the entrepreneur.",
            items: {
                type: Type.OBJECT,
                properties: {
                    item: { type: Type.STRING, description: "The recommendation text." },
                    priority: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: "The priority of the recommendation." }
                },
                required: ['item', 'priority']
            }
        }
    },
    required: ['reportTitle', 'executiveSummary', 'keyMetrics', 'incomeStatement', 'financialRatios', 'charts', 'swotAnalysis', 'detailedAnalysis', 'actionableRecommendations', 'cashFlowAnalysis', 'salesInsights', 'futureOutlook', 'riskAnalysis']
  };

  const transactionLogs = transactions.length > 0
    ? transactions.map(t =>
        `- Date: ${t.date}, Type: ${t.type}, Amount: ${t.amount.toFixed(2)}, Category: ${t.productServiceCategory || 'Uncategorized'}, Customer: ${t.customerName || 'N/A'}, Desc: ${t.description}`
      ).join('\n')
    : "No transactions were recorded for this period.";

  const prompt = `
    Act as a 5-star award-winning financial analyst, data scientist, and business consultant for the Africa Entrepreneurship School (AES).
    Your client is ${entrepreneur.name}, the owner of the business "${entrepreneur.businessName}".
    Your analysis and all commentary should be hyper-personalized and frequently reference the business name, "${entrepreneur.businessName}".
    Analyze the following transaction logs for the business for the period of ${period}.
    Your task is to generate a comprehensive, professional, and visually insightful financial performance report. The tone must be encouraging, clear, and highly strategic.

    Transaction Logs:
    ${transactionLogs}

    Based on the data, produce a report in JSON format following the provided schema. You must generate all sections.
    - The report title should be dynamic and reference the business name, e.g., "Financial Performance Report for ${entrepreneur.businessName}".
    - **cashFlowAnalysis**: Write a paragraph simply explaining the difference between profit and cash flow, and then analyze the cash flow for the period based on the transactions.
    - **salesInsights**: Identify the top 3-5 customers and top 3-5 products/services by revenue. If there are no customer names or categories, state that.
    - **futureOutlook**: Write a qualitative forecast for the business for the next period, and list 2-3 strategic trends the entrepreneur should watch.
    - **riskAnalysis**: Identify 2-3 key business risks (e.g., high customer concentration, negative cash flow, reliance on one product). For each, describe the risk, assess its impact (High, Medium, Low), and suggest a concrete mitigation strategy.
    - **incomeStatement**: Generate a simple Profit & Loss statement for "${entrepreneur.businessName}". Calculate Revenue (Total Income), list major Expense categories, and determine the final Net Income.
    - **financialRatios**: Calculate at least 2 key ratios like Profit Margin for "${entrepreneur.businessName}". Provide the formula and a simple interpretation.
    - **charts**: Propose 1 or 2 meaningful data visualizations (bar, pie, or line). For example, a bar chart for 'Expenses by Category' or a pie chart for 'Income by Source'. Provide the chart type, title, and the necessary data array.
    - **swotAnalysis**: Based on the financial data, infer 1-2 points for each SWOT category for "${entrepreneur.businessName}". Strengths/Weaknesses are internal (e.g., high profit margin, high reliance on one product). Opportunities/Threats are external (e.g., potential to expand services, rising costs of supplies).
    - **detailedAnalysis**: Write 2 deep-dive paragraphs on interesting patterns specific to "${entrepreneur.businessName}".
    - **actionableRecommendations**: Provide 3-5 concrete next steps for ${entrepreneur.name} to take, and prioritize them.
    If there are no transactions, generate a report stating that, focusing on recommendations for setting up financial tracking for "${entrepreneur.businessName}".
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: reportSchema,
        temperature: 0.2 // Lower temperature for more deterministic, factual report generation
      }
    });

    const reportJson = JSON.parse(response.text);
    return reportJson as AiReport;

  } catch (error) {
    console.error("Error fetching AI report from Gemini API:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
        throw new Error("Failed to get insights: The Gemini API key is not valid. Please check your configuration.");
    }
    throw new Error(`Failed to generate AI report. Error: ${err.message}`);
  }
};


export const generateGrowthPlan = async (
  businessProfile: string,
  needsAssessment: string,
  entrepreneurName: string,
  resourceLibrary: Resource[],
): Promise<GrowthPlan> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot generate Growth Plan.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const growthPlanSchema = {
    type: Type.OBJECT,
    properties: {
        executiveSummary: { type: Type.STRING, description: "A 2-3 sentence strategic summary of the growth plan." },
        strategicRecommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Title for the recommendation, e.g., 'Enhance Digital Presence'." },
                    recommendation: { type: Type.STRING, description: "A detailed, actionable recommendation." },
                    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The priority of this action."}
                },
                required: ['title', 'recommendation', 'priority']
            }
        },
        suggestedDocuments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    documentName: { type: Type.STRING, description: "The common name of the legal or business document, e.g., 'Partnership Agreement'." },
                    description: { type: Type.STRING, description: "A brief explanation of why this document is needed." },
                    contractType: { type: Type.STRING, description: "A machine-readable type for the contract, e.g., 'partnership-agreement'." }
                },
                required: ['documentName', 'description', 'contractType']
            }
        },
        suggestedResources: {
            type: Type.ARRAY,
            description: "A list of 2-3 highly relevant resources from the provided library.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The exact title of the suggested resource from the library." },
                    reason: { type: Type.STRING, description: "A brief, one-sentence explanation for why this specific resource is recommended for the entrepreneur."}
                },
                required: ['title', 'reason']
            }
        }
    },
    required: ['executiveSummary', 'strategicRecommendations', 'suggestedDocuments', 'suggestedResources']
  };
  
  const resourceListText = resourceLibrary.map(r => `- "${r.title}": ${r.description}`).join('\n');

  const prompt = `
    Act as a world-class business strategist and consultant for the Africa Entrepreneurship School (AES).
    You are creating a strategic growth plan for an entrepreneur named ${entrepreneurName}.
    
    Here is their business profile:
    ---
    ${businessProfile}
    ---

    Here is their self-assessed needs:
    ---
    ${needsAssessment}
    ---

    Based on this information, generate a concise, high-impact, and actionable growth plan. The tone should be empowering and strategic.
    Provide the output in JSON format according to the provided schema.

    - For suggestedDocuments, identify 2-4 critical business documents they might need (e.g., Partnership Agreement, Client Service Agreement). Use a simple, machine-readable string for the contractType (e.g., partnership-agreement).
    - **Crucially**, from the "Available Resources" list below, select the 2 or 3 most relevant resources that directly address the entrepreneur's needs. For each, provide its exact title and a short reason for your recommendation.

    Available Resources:
    ---
    ${resourceListText}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: growthPlanSchema,
        temperature: 0.5
      }
    });
    return JSON.parse(response.text) as GrowthPlan;
  } catch (error) {
    console.error("Error generating Growth Plan from Gemini API:", error);
    throw new Error(`Failed to generate Growth Plan. Error: ${(error as Error).message}`);
  }
};


export const generateContract = async (
  contractType: string,
  businessProfile: string
): Promise<ContractData> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Cannot generate contract.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const contractSchema = {
      type: Type.OBJECT,
      properties: {
          title: { type: Type.STRING, description: "The full title of the contract." },
          clauses: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      title: { type: Type.STRING, description: "The title of the clause, e.g., '1. Parties'." },
                      content: { type: Type.STRING, description: "The full legal text of the clause. Use placeholders like '[Your Company Name]' or '[Partner Name]' where appropriate. Use \\n for line breaks." }
                  },
                  required: ['title', 'content']
              }
          }
      },
      required: ['title', 'clauses']
  };

  const prompt = `
    Act as a helpful legal assistant providing a starting template for a business contract.
    You are NOT a lawyer and this is NOT legal advice. The user should consult a legal professional.

    The contract requested is: ${contractType.replace(/-/g, ' ')}.

    The business profile is:
    ---
    ${businessProfile}
    ---

    Generate a standard, well-structured draft for this contract. Use the business profile to pre-fill information where possible (like the business name). For other party's information or specific dates/amounts, use clear placeholders like '[Name of Other Party]', '[Effective Date]', '[Project Scope]', etc.
    Provide the output in JSON format according to the provided schema. The contract should contain all the typical and essential clauses for such an agreement.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: contractSchema,
        temperature: 0.3
      }
    });
    return JSON.parse(response.text) as ContractData;
  } catch (error) {
    console.error("Error generating contract from Gemini API:", error);
    throw new Error(`Failed to generate contract. Error: ${(error as Error).message}`);
  }
};

export const generateDashboardInsights = async (
  entrepreneurs: Entrepreneur[],
  transactions: Transaction[]
): Promise<DashboardInsight[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API key not configured. Cannot generate dashboard insights.");
    return [];
  }
  if (transactions.length === 0) {
    return []; // No data to analyze
  }
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
    }
  };

  const dataSummary = {
    entrepreneurs: entrepreneurs.map(e => ({ id: e.id, name: e.name, businessName: e.businessName })),
    transactions: transactions.map(t => ({ id: t.id, entrepreneurId: t.entrepreneurId, type: t.type, date: t.date, amount: t.amount, product: t.productServiceCategory }))
  };

  const prompt = `
    Act as an expert business analyst for a startup incubator. Your task is to analyze the following dataset of entrepreneurs and their financial transactions and identify up to 4 insightful observations. These insights should be actionable or highlight significant events.

    Current Date: ${new Date().toISOString().split('T')[0]}

    Data:
    ${JSON.stringify(dataSummary)}

    Instructions:
    1.  Analyze the provided JSON data.
    2.  Identify up to 4 of the most important insights. An insight can be one of four types:
        *   'milestone': 🎉 A significant positive achievement (e.g., reaching a revenue goal, high profitability).
        *   'warning': ⚠️ A potential issue or risk (e.g., unusually high expenses for one category, an entrepreneur with no recent activity).
        *   'opportunity': 💡 A potential area for growth or improvement (e.g., a fast-growing product category across businesses).
        *   'trend': 📉 An interesting pattern observed across multiple entrepreneurs or over time (e.g., seasonality in sales, a general increase in a specific expense category).
    3.  For each insight, provide a concise title, a one-sentence description, the corresponding icon, and an array of related entrepreneur IDs if the insight applies to specific individuals.
    4.  Return the output as a JSON object that adheres to the provided schema. If no significant insights are found, return an object with an empty insights array.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: insightsSchema,
        temperature: 0.5
      }
    });

    const result = JSON.parse(response.text);
    return result.insights || [];
  } catch (error) {
    console.error("Error generating dashboard insights from Gemini API:", error);
    // Don't throw, just return empty so the UI doesn't break
    return [];
  }
};

export const queryDataWithAi = async (
  query: string,
  entrepreneurs: Entrepreneur[],
  transactions: Transaction[],
  history: ChatMessage[]
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API key is not configured. The 'Ask AI' feature is unavailable.");
    }
    const ai = new GoogleGenAI({ apiKey });

    // Sanitize and summarize data to ensure it fits within context limits and is easy for the model to parse.
    const dataSummary = {
        entrepreneurs: entrepreneurs.map(({ id, name, businessName }) => ({ id, name, businessName })),
        transactions: transactions.map(({ id, entrepreneurId, type, date, description, amount, customerName, productServiceCategory }) => ({ id, entrepreneurId, type, date, description, amount, customerName, category: productServiceCategory })),
    };
    
    // Format conversation history for the prompt
    const historyText = history.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');

    const systemInstruction = `
        You are 'Aida', a friendly and helpful AI data assistant for the AES JAC Admin Portal. Your purpose is to answer questions about a group of entrepreneurs and their financial data.
        - The user's data is provided below in JSON format.
        - You must base your answers *exclusively* on the data provided. Do not invent information.
        - If a question cannot be answered from the data, politely state that.
        - Keep your answers concise and clear.
        - When presenting lists of data (like transactions or entrepreneurs), format them neatly using markdown.
        - The current date is ${new Date().toLocaleDateString()}.
        - Refer to entrepreneurs by their business name if possible.
        - The entire conversation history is provided for context.
    `;
    
    const prompt = `
      ${systemInstruction}
      
      USER'S DATA:
      ${JSON.stringify(dataSummary, null, 2)}
      
      CONVERSATION HISTORY:
      ${historyText}
      
      CURRENT USER QUESTION:
      ${query}
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.2
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error with 'Ask AI' query from Gemini API:", error);
        throw new Error(`Sorry, I encountered an error trying to answer that. Please try again. Details: ${(error as Error).message}`);
    }
};
