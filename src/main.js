const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// DOM Elements
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const removeFile = document.getElementById('removeFile');
const uploadButton = document.getElementById('uploadButton');
const downloadKey = document.getElementById('downloadKey');
const downloadButton = document.getElementById('downloadButton');
const shareKeySection = document.getElementById('shareKeySection');
const shareKeyElement = document.getElementById('shareKey');
const timeLeftElement = document.getElementById('timeLeft');
const messageElement = document.getElementById('message');

let selectedFile = null;

// Utility Functions
const generateKey = () => Math.random().toString(36).substring(2, 15);

const showMessage = (text, type) => {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
  setTimeout(() => {
    messageElement.className = 'message hidden';
  }, 5000);
};

const formatTimeLeft = (timestamp) => {
  const now = Date.now();
  const timeLeft = timestamp + EXPIRY_TIME - now;
  
  if (timeLeft <= 0) return 'Expired';
  
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${hours}h ${minutes}m remaining`;
};

const cleanupExpiredFiles = () => {
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    try {
      const fileData = JSON.parse(localStorage.getItem(key));
      if (fileData.timestamp && now - fileData.timestamp > EXPIRY_TIME) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Skip if item is not a valid JSON or not our file data
    }
  });
};

// File Input Handling
fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  
  if (selectedFile) {
    if (selectedFile.size > 5 * 1024 * 1024) {
      showMessage('File size must be less than 5MB', 'error');
      selectedFile = null;
      fileInput.value = '';
      filePreview.className = 'file-preview hidden';
      uploadButton.disabled = true;
      uploadButton.className = 'button disabled';
      return;
    }
    
    fileName.textContent = selectedFile.name;
    filePreview.className = 'file-preview';
    uploadButton.disabled = false;
    uploadButton.className = 'button';
  }
});

removeFile.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreview.className = 'file-preview hidden';
  uploadButton.disabled = true;
  uploadButton.className = 'button disabled';
});

// File Upload
uploadButton.addEventListener('click', () => {
  if (!selectedFile) return;

  const reader = new FileReader();
  reader.onload = () => {
    const key = generateKey();
    const fileData = {
      id: key,
      data: reader.result,
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(key, JSON.stringify(fileData));
      shareKeyElement.textContent = key;
      shareKeySection.className = 'share-section';
      showMessage('File uploaded successfully! Share the key with others. File will expire in 24 hours.', 'success');
      
      // Reset upload form
      selectedFile = null;
      fileInput.value = '';
      filePreview.className = 'file-preview hidden';
      uploadButton.disabled = true;
      uploadButton.className = 'button disabled';
      
      // Start time left updates
      updateTimeLeft(key);
    } catch (err) {
      showMessage('Failed to upload file', 'error');
    }
  };

  reader.readAsDataURL(selectedFile);
});

// Download Key Input Handling
downloadKey.addEventListener('input', (e) => {
  const hasValue = e.target.value.trim() !== '';
  downloadButton.disabled = !hasValue;
  downloadButton.className = hasValue ? 'button' : 'button disabled';
});

// File Download
downloadButton.addEventListener('click', () => {
  const key = downloadKey.value.trim();
  if (!key) return;

  try {
    const fileDataStr = localStorage.getItem(key);
    if (!fileDataStr) {
      throw new Error('File not found');
    }

    const fileData = JSON.parse(fileDataStr);
    
    // Check if file has expired
    if (Date.now() - fileData.timestamp > EXPIRY_TIME) {
      localStorage.removeItem(key);
      throw new Error('File has expired');
    }

    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('File downloaded successfully!', 'success');
    downloadKey.value = '';
    downloadButton.disabled = true;
    downloadButton.className = 'button disabled';
  } catch (err) {
    showMessage(err.message || 'Invalid key or file not found', 'error');
  }
});

// Time Left Updates
function updateTimeLeft(key) {
  const updateTime = () => {
    try {
      const fileData = JSON.parse(localStorage.getItem(key));
      timeLeftElement.textContent = formatTimeLeft(fileData.timestamp);
    } catch (e) {
      timeLeftElement.textContent = '';
    }
  };

  updateTime();
  const interval = setInterval(updateTime, 60000); // Update every minute
  
  // Clear interval when the share section is hidden
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.className === 'share-section hidden') {
        clearInterval(interval);
        observer.disconnect();
      }
    });
  });
  
  observer.observe(shareKeySection, { attributes: true, attributeFilter: ['class'] });
}

// Initialize
cleanupExpiredFiles();
setInterval(cleanupExpiredFiles, 60000); // Clean up every minute