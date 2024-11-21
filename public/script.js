// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    const errorDiv = document.getElementById('error');

    // Create and add loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Processing conversations...</div>
    `;
    document.body.appendChild(loadingOverlay);

    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (!file || file.type !== 'application/json') {
            errorDiv.textContent = 'Please select a valid JSON file';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Show loading overlay
                loadingOverlay.classList.add('active');
                errorDiv.textContent = '';

                let conversations = JSON.parse(e.target.result);
                const response = await fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(conversations)
                });
                
                if (response.ok) {
                    document.documentElement.innerHTML = await response.text();
                    
                    // Update URL with timestamp
                    window.history.replaceState(
                        {}, 
                        '', 
                        window.location.pathname + '?t=' + Date.now()
                    );
                } else {
                    // Hide loading overlay on error
                    loadingOverlay.classList.remove('active');
                    errorDiv.textContent = 'Error uploading conversation';
                }
            } catch (error) {
                // Hide loading overlay on error
                loadingOverlay.classList.remove('active');
                errorDiv.textContent = 'Invalid JSON format';
            }
        };

        reader.onerror = () => {
            loadingOverlay.classList.remove('active');
            errorDiv.textContent = 'Error reading file';
        };

        reader.readAsText(file);
    }
});