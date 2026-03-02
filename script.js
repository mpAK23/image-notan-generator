document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const originalPreview = document.getElementById('originalPreview');
    const workspace = document.getElementById('workspace');
    const loader = document.getElementById('loader');

    const canvases = {
        '2V': document.getElementById('notan2Value'),
        '3V': document.getElementById('notan3Value')
    };

    const downloadBtns = {
        '2V': document.getElementById('download2V'),
        '3V': document.getElementById('download3V')
    };

    imageUpload.addEventListener('change', handleImageUpload);

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        showLoader(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Check if file size > 10MB (10 * 1024 * 1024 bytes)
                if (file.size > 10 * 1024 * 1024) {
                    console.log('Large image detected, downsizing...');
                    downsizeAndProcess(img);
                } else {
                    displayOriginal(img);
                    processNotan(img);
                    workspace.classList.add('visible');
                    showLoader(false);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function downsizeAndProcess(img) {
        const maxDimension = 2000; // Adequate for study
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = (height / width) * maxDimension;
                width = maxDimension;
            } else {
                width = (width / height) * maxDimension;
                height = maxDimension;
            }
        }

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const ctx = offscreenCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const downsizedImg = new Image();
        downsizedImg.onload = () => {
            displayOriginal(downsizedImg);
            processNotan(downsizedImg);
            workspace.classList.add('visible');
            showLoader(false);
        };
        downsizedImg.src = offscreenCanvas.toDataURL('image/jpeg', 0.8);
    }

    function displayOriginal(img) {
        originalPreview.innerHTML = '';
        const previewImg = img.cloneNode();
        originalPreview.appendChild(previewImg);
    }

    function processNotan(img) {
        // Calculate dimensions maintaining aspect ratio
        const maxWidth = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            const scale = maxWidth / width;
            width = maxWidth;
            height = height * scale;
        }

        Object.values(canvases).forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });

        // 2-Value Notan
        process(img, canvases['2V'], (avg) => {
            // Logic provided by user: avg > 128 ? 255 : 0
            return avg > 128 ? 255 : 0;
        });

        // 3-Value Notan
        process(img, canvases['3V'], (avg) => {
            // Logic provided by user: < 85 is black, 85–170 is gray, > 170 is white
            if (avg < 85) return 0;
            if (avg <= 170) return 128; // Gray
            return 255;
        });

        setupDownloads();
    }

    function process(img, canvas, thresholdFn) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Calculate perceived brightness (luminance) for better results than simple avg
            // But using simple avg as requested: (r+g+b)/3
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = thresholdFn(avg);

            data[i] = data[i + 1] = data[i + 2] = val;
            // data[i+3] remains as is (alpha)
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function setupDownloads() {
        Object.keys(downloadBtns).forEach(key => {
            const btn = downloadBtns[key];
            const canvas = canvases[key];

            btn.disabled = false;

            // Remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            downloadBtns[key] = newBtn;

            newBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `notan-${key}-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });
    }

    function showLoader(show) {
        if (show) loader.classList.add('active');
        else loader.classList.remove('active');
    }
});
