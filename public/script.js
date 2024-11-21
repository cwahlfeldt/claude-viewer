document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    const errorDiv = document.getElementById('error');

    // Add drag and drop visual feedback
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f9f9f9';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = 'white';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'white';
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
                    
                    // After successful upload, update the URL to include a timestamp
                    // This helps prevent browser cache issues when reloading
                    window.history.replaceState(
                        {}, 
                        '', 
                        window.location.pathname + '?t=' + Date.now()
                    );
                } else {
                    errorDiv.textContent = 'Error uploading conversation';
                }
            } catch (error) {
                errorDiv.textContent = 'Invalid JSON format';
            }
        };
        reader.readAsText(file);
    }
});