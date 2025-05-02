// Import the API key from our config
import { HF_API_KEY } from '../utils/config';

// Define interfaces for better type safety
interface MessageRequest {
  action: string;
  [key: string]: any;
}

interface SearchRequest extends MessageRequest {
  query?: string;
  mimeType?: string;
  timeQuery?: string;
  ownershipQuery?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  fileExtension?: string;
  createdTime?: string;
  modifiedTime?: string;
  [key: string]: any;
}

interface OrganizationFolder {
  name: string;
  files: string[];
}

interface OrganizationPlan {
  folders: OrganizationFolder[];
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse) => {
  // Handle authentication
  if (request.action === "authenticate") {
    chrome.identity.getAuthToken({ interactive: true }, (result) => {
      if (result) {
        sendResponse({ success: true, token: result as string });
      } else {
        sendResponse({ success: false, error: "Failed to authenticate" });
      }
    });
    return true;
  }

  // Function to fetch google account authentication
  if (request.action === "auth") {
    chrome.identity.getAuthToken({ interactive: true }, (result) => {
      const token = result as string;
      if (!token) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError?.message || "Auth failed",
        });
        return;
      }
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((userInfo) => {
          chrome.runtime.sendMessage({
            action: "authUpdated",
            email: userInfo.email,
            profilePicture: userInfo.picture,
          });
          sendResponse({
            success: true,
            email: userInfo.email,
            profilePicture: userInfo.picture,
            name: userInfo.name,
          });
        })
        .catch((_err) => {
          sendResponse({
            success: false,
            error: "Failed to fetch user info",
          });
        });
    });
    return true;
  }

  // Function to search user's Google Drive
  if (request.action === "searchDrive") {
    chrome.identity.getAuthToken({ interactive: false }, (result) => {
      if (!result) {
        sendResponse({
          error: chrome.runtime.lastError?.message || "Auth token not found",
        });
        return;
      }

      const token = result as string;
      let allFiles: DriveFile[] = [];

      // Function to fetch a page of results
      const fetchPage = (pageToken: string | null = null) => {
        const params: Record<string, string> = {
          fields:
            "nextPageToken, files(id,name,mimeType,viewedByMeTime,thumbnailLink,owners,shared,starred)",
          orderBy: "viewedByMeTime desc",
          pageSize: "1000",
          spaces: "drive",
          corpora: "user",
        };

        // Add page token if we have one
        if (pageToken) {
          params.pageToken = pageToken;
        }

        // Build the query string
        let queryParts: string[] = [];

        // Handle search query
        if ((request as SearchRequest).query && (request as SearchRequest).query?.trim() !== "") {
          queryParts.push(`name contains '${(request as SearchRequest).query}'`);
        }

        // Handle multiple mime types
        if ((request as SearchRequest).mimeType) {
          const mimeTypes = (request as SearchRequest).mimeType?.split(",") || [];
          if (mimeTypes.length > 0) {
            const mimeTypeQueries = mimeTypes.map(
              (type: string) => `mimeType contains '${type.trim()}'`
            );
            queryParts.push(`(${mimeTypeQueries.join(" or ")})`);
          }
        }

        // Handle time period filters
        if ((request as SearchRequest).timeQuery) {
          queryParts.push(`(${(request as SearchRequest).timeQuery})`);
        }

        // Handle ownership filters
        if ((request as SearchRequest).ownershipQuery) {
          queryParts.push(`(${(request as SearchRequest).ownershipQuery})`);
        }

        // Combine all query parts with AND
        if (queryParts.length > 0) {
          params.q = queryParts.join(" and ");
        }

        const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams(
          params
        ).toString()}`;

        fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => response.json())
          .then((data: { files?: DriveFile[], nextPageToken?: string, error?: any }) => {
            if (data.error) {
              sendResponse({ error: data.error.message });
            } else {
              if (data.files) {
                allFiles = [...allFiles, ...(data.files || [])];
              }

              if (data.nextPageToken !== null && data.nextPageToken !== undefined) {
                chrome.runtime.sendMessage({
                  action: "searchProgress",
                  count: allFiles.length,
                  hasMoreResults: true,
                });

                // Fetch the next page
                fetchPage(data.nextPageToken);
              } else {
                // All pages fetched, send the response
                sendResponse({ results: allFiles });
              }
            }
          })
          .catch((_err) => {
            sendResponse({ error: _err.message });
          });
      };

      fetchPage();
      return true;
    });
    return true;
  }

  // Function to organize files with AI based on preset
  if (request.action === "organizeWithAI") {
    chrome.identity.getAuthToken({ interactive: false }, (result) => {
      if (!result) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError?.message || "Auth token not found",
        });
        return;
      }

      const token = result as string;

      // Get current folder ID from the active tab URL
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const currentTab = tabs[0];
        const tabUrl = new URL(currentTab.url || '');
        let folderId = "root";

        // Extract folder ID from Google Drive URL (keeps track of current screen)
        if (tabUrl.pathname.includes("/folders/")) {
          const folderMatch = tabUrl.pathname.match(/\/folders\/([^\/]+)/);
          if (folderMatch && folderMatch[1]) {
            folderId = folderMatch[1];
          }
        }

        // Send progress update
        chrome.runtime.sendMessage({
          action: "organizationProgress",
          progress: 10,
          status: "Fetching files from Google Drive...",
        });

        // Fetch files from the current folder
        const params = {
          fields:
            "files(id,name,mimeType,fileExtension,createdTime,modifiedTime)",
          q: `'${folderId}' in parents and trashed=false`,
          pageSize: "1000",
          spaces: "drive",
        };

        const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams(
          params
        ).toString()}`;

        fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch files");
            }
            return response.json();
          })
          .then(async (data) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
              return;
            }

            const files = data.files || [];

            if (files.length === 0) {
              sendResponse({
                success: false,
                error: "No files found in this folder",
              });
              return;
            }

            // Send progress update
            chrome.runtime.sendMessage({
              action: "organizationProgress",
              progress: 30,
              status: `Analyzing ${files.length} files with AI...`,
            });

            // Get organization plan based on preset
            const organizationPlan = await getOrganizationPlan(
              request.preset,
              files
            );

            // Send progress update
            chrome.runtime.sendMessage({
              action: "organizationProgress",
              progress: 60,
              status: `Creating folders and organizing files...`,
            });

            // Create folders and move files according to the plan
            try {
              await executeOrganizationPlan(organizationPlan, folderId, token);

              // Send progress update
              chrome.runtime.sendMessage({
                action: "organizationProgress",
                progress: 100,
                status: "Organization complete!",
              });

              sendResponse({ success: true });
            } catch (error: any) {
              // Send error update
              chrome.runtime.sendMessage({
                action: "organizationProgress",
                progress: 0,
                status: `Error: ${error.message || 'Unknown error'}`,
              });

              sendResponse({ success: false, error: error.message || 'Unknown error' });
            }
          })
          .catch((error: any) => {
            // Send error update
            chrome.runtime.sendMessage({
              action: "organizationProgress",
              progress: 0,
              status: `Error: ${error.message || 'Unknown error'}`,
            });

            sendResponse({ success: false, error: error.message || 'Unknown error' });
          });
      });

      return true;
    });
    return true;
  }

  // Function to update dark mode on all tabs
  if (request.action === "darkModeChanged") {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateDarkMode",
            value: request.value,
          });
        }
      }
    });
    return true;
  }

  // Function to handle unknown actions
  sendResponse({ error: "Unknown action" });
});

// Function to get organization plan from Hugging Face Inference API (mistralai/Mistral-7B-Instruct-v0.2)
async function getOrganizationPlan(preset: string, files: DriveFile[]): Promise<OrganizationPlan> {
  // Define organization rules based on preset
  let organizationPrompt = "";

  switch (preset) {
    // Projects preset
    case "preset1":
      organizationPrompt = `
        I have a list of files in my Google Drive folder. Please help me organize them by project.
        Look at the file names and types to determine which project they might belong to.
        Group similar files together based on naming patterns, file types, and potential project themes.
        For each group, suggest a folder name that represents the project theme.
        
        Here are the files:
        ${files.map((file) => `- ${file.name} (${file.mimeType})`).join("\n")}
        
        Provide your answer in this JSON format:
        {
          "folders": [
            {
              "name": "Project Name 1",
              "files": ["file1.ext", "file2.ext"]
            },
            {
              "name": "Project Name 2",
              "files": ["file3.ext", "file4.ext"]
            }
          ]
        }
      `;
      break;

    // File Types preset
    case "preset2":
      organizationPrompt = `
        I have a list of files in my Google Drive folder. Please help me organize them by file type.
        Group files with similar extensions or mime types together.
        
        Here are the files:
        ${files.map((file) => `- ${file.name} (${file.mimeType})`).join("\n")}
        
        Provide your answer in this JSON format:
        {
          "folders": [
            {
              "name": "Documents",
              "files": ["doc1.docx", "doc2.pdf"]
            },
            {
              "name": "Images",
              "files": ["image1.jpg", "image2.png"]
            }
          ]
        }
      `;
      break;

    // Date preset
    case "preset3":
      organizationPrompt = `
        I have a list of files in my Google Drive folder. Please help me organize them by date.
        Group files created in similar time periods together.
        
        Here are the files with their creation dates:
        ${files
          .map((file) => `- ${file.name} (Created: ${file.createdTime})`)
          .join("\n")}
        
        Provide your answer in this JSON format:
        {
          "folders": [
            {
              "name": "2023 Q1",
              "files": ["file1.ext", "file2.ext"]
            },
            {
              "name": "2023 Q2",
              "files": ["file3.ext", "file4.ext"]
            }
          ]
        }
      `;
      break;

    default:
      throw new Error("Invalid preset selected");
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use the imported API key from config
          Authorization: `Bearer ${HF_API_KEY || ''}`,
        },
        body: JSON.stringify({
          inputs: organizationPrompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      }
    );

    const result = await response.json();

    // Parse the AI response to extract the JSON
    let jsonMatch;
    if (result.generated_text) {
      jsonMatch = result.generated_text.match(/\{[\s\S]*\}/);
    } else if (Array.isArray(result) && result[0]?.generated_text) {
      jsonMatch = result[0].generated_text.match(/\{[\s\S]*\}/);
    }

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse AI response");
    }
  } catch (error: any) {
    console.error("Error getting organization plan:", error);

    // Fallback to simple organization if AI fails
    return getFallbackOrganizationPlan(preset, files);
  }
}

// Fallback option
function getFallbackOrganizationPlan(preset: string, files: DriveFile[]): OrganizationPlan {
  switch (preset) {
    case "preset1":
      // Simple keyword-based organization
      const projectKeywords: Record<string, string[]> = {
        Report: ["report", "analysis", "summary"],
        Presentation: ["presentation", "slides", "deck"],
        Data: ["data", "csv", "excel", "sheet"],
        Media: ["image", "photo", "video", "mp4", "jpg", "png"],
        Documents: ["doc", "pdf", "text"],
      };

      const projectFolders: Record<string, string[]> = {};

      files.forEach((file) => {
        let assigned = false;
        for (const [project, keywords] of Object.entries(projectKeywords)) {
          for (const keyword of keywords) {
            if (
              file.name.toLowerCase().includes(keyword.toLowerCase()) ||
              (file.mimeType &&
                file.mimeType.toLowerCase().includes(keyword.toLowerCase()))
            ) {
              if (!projectFolders[project]) {
                projectFolders[project] = [];
              }
              projectFolders[project].push(file.name);
              assigned = true;
              break;
            }
          }
          if (assigned) break;
        }

        if (!assigned) {
          if (!projectFolders["Other"]) {
            projectFolders["Other"] = [];
          }
          projectFolders["Other"].push(file.name);
        }
      });

      return {
        folders: Object.entries(projectFolders).map(([name, files]) => ({
          name,
          files,
        })),
      };

    case "preset2": // By File Types
      const typeFolders: Record<string, string[]> = {};

      files.forEach((file) => {
        let folderName = "Other";

        if (
          file.mimeType.includes("document") ||
          file.mimeType.includes("pdf") ||
          file.name.match(/\.(doc|docx|pdf|txt|rtf)$/i)
        ) {
          folderName = "Documents";
        } else if (
          file.mimeType.includes("spreadsheet") ||
          file.name.match(/\.(xls|xlsx|csv)$/i)
        ) {
          folderName = "Spreadsheets";
        } else if (
          file.mimeType.includes("presentation") ||
          file.name.match(/\.(ppt|pptx)$/i)
        ) {
          folderName = "Presentations";
        } else if (
          file.mimeType.includes("image") ||
          file.name.match(/\.(jpg|jpeg|png|gif|bmp)$/i)
        ) {
          folderName = "Images";
        } else if (
          file.mimeType.includes("video") ||
          file.name.match(/\.(mp4|mov|avi|wmv)$/i)
        ) {
          folderName = "Videos";
        } else if (
          file.mimeType.includes("audio") ||
          file.name.match(/\.(mp3|wav|ogg|flac)$/i)
        ) {
          folderName = "Audio";
        } else if (file.mimeType.includes("folder")) {
          folderName = "Subfolders";
        }

        if (!typeFolders[folderName]) {
          typeFolders[folderName] = [];
        }
        typeFolders[folderName].push(file.name);
      });

      return {
        folders: Object.entries(typeFolders).map(([name, files]) => ({
          name,
          files,
        })),
      };

    case "preset3": // By Date
      const dateFolders: Record<string, string[]> = {};

      files.forEach((file) => {
        const createdDate = new Date(
          file.createdTime || file.modifiedTime || new Date()
        );
        const year = createdDate.getFullYear();
        const month = createdDate.getMonth() + 1;
        let quarter;

        if (month <= 3) quarter = "Q1";
        else if (month <= 6) quarter = "Q2";
        else if (month <= 9) quarter = "Q3";
        else quarter = "Q4";

        const folderName = `${year} ${quarter}`;

        if (!dateFolders[folderName]) {
          dateFolders[folderName] = [];
        }
        dateFolders[folderName].push(file.name);
      });

      return {
        folders: Object.entries(dateFolders).map(([name, files]) => ({
          name,
          files,
        })),
      };

    default:
      return {
        folders: [
          {
            name: "Organized Files",
            files: files.map((f) => f.name),
          },
        ],
      };
  }
}

// Execute the organization plan by creating folders and moving files
async function executeOrganizationPlan(plan: OrganizationPlan, parentFolderId: string, token: string) {
  const folderPromises = plan.folders.map(async (folder, index, array) => {
    // Skip empty folders
    if (!folder.files || folder.files.length === 0) {
      return;
    }

    // Send progress update for each folder
    const progressPerFolder = 40 / array.length; // 40% of progress divided by number of folders
    const baseProgress = 60; // Starting from 60%
    const currentProgress = baseProgress + progressPerFolder * index;

    chrome.runtime.sendMessage({
      action: "organizationProgress",
      progress: Math.min(95, currentProgress), // Cap at 95% until fully complete
      status: `Creating folder: ${folder.name}...`,
    });

    // Create folder
    const folderResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folder.name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        }),
      }
    );

    const folderData = await folderResponse.json();

    if (folderData.error) {
      throw new Error(`Failed to create folder: ${folderData.error.message}`);
    }

    const newFolderId = folderData.id;

    // Get file IDs for the files to move
    const fileListResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${parentFolderId}' in parents and trashed=false&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const fileListData = await fileListResponse.json();

    if (fileListData.error) {
      throw new Error(`Failed to list files: ${fileListData.error.message}`);
    }

    // Move files to the new folder
    const movePromises = folder.files.map(async (fileName, fileIndex) => {
      const fileObj = fileListData.files.find((f: any) => f.name === fileName);

      if (!fileObj) {
        console.warn(`File not found: ${fileName}`);
        return;
      }

      // Send detailed progress update for each file
      chrome.runtime.sendMessage({
        action: "organizationProgress",
        progress: Math.min(
          95,
          currentProgress +
            progressPerFolder * (fileIndex / folder.files.length)
        ),
        status: `Moving file: ${fileName} to ${folder.name}...`,
      });

      const moveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileObj.id}?addParents=${newFolderId}&removeParents=${parentFolderId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const moveData = await moveResponse.json();

      if (moveData.error) {
        throw new Error(
          `Failed to move file ${fileName}: ${moveData.error.message}`
        );
      }
    });

    await Promise.all(movePromises);
  });

  await Promise.all(folderPromises);
}
