const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput');

// Load the honjitsu logo image
const honjitsuLogo = new Image();

// Default text settings
let textSettings = {
    fontSize: 32,
    horizontalAlign: 'left',
    verticalAlign: 'middle'
};

// Restore text and settings from localStorage if exists
const savedText = localStorage.getItem('bluesky-text') || 
`# Naik Delman

1. Pada hari minggu kuturut <y>ayah ke kota</y>

2. Naik <o>delman istimewa</o> kududuk di muka

3. Kududuk <y>samping pak kusir</y> yang <o>sedang bekerja</o>

4. Mengendarai kuda supaya <o>BAIK JALANNYA</o>`;

const savedSettings = JSON.parse(localStorage.getItem('bluesky-text-settings') || JSON.stringify(textSettings));
textSettings = savedSettings;
textInput.value = savedText;

// Update font size display
document.getElementById('fontSize').textContent = textSettings.fontSize;

// Set canvas size
canvas.width = 1000;
canvas.height = 1200;

// Load the image and draw initial canvas after it loads
honjitsuLogo.onload = function() {
    drawImage(savedText);
};

// Set image source after setting up the onload handler
honjitsuLogo.src = 'assets/honjitsu-logo-new.png';

function parseMarkdown(text) {
    const lines = text.split('\n');
    const parsedLines = [];
    
    lines.forEach(line => {
        if (line.startsWith('#')) {
            // Handle hashtag titles
            const level = line.match(/^#+/)[0].length;
            const titleText = line.replace(/^#+\s*/, '');
            parsedLines.push({
                type: 'title',
                text: titleText,
                level: level
            });
        } else {
            // Handle regular text with highlighting
            parsedLines.push({
                type: 'text',
                text: line,
                segments: parseHighlights(line)
            });
        }
    });
    
    return parsedLines;
}

function parseHighlights(text) {
    const segments = [];
    let currentPos = 0;
    
    // Regex to find <yellow> and <orange> tags
    const highlightRegex = /<(y|o)>(.*?)<\/\1>/g;
    let match;
    
    while ((match = highlightRegex.exec(text)) !== null) {
        // Add text before the highlight
        if (match.index > currentPos) {
            segments.push({
                type: 'normal',
                text: text.substring(currentPos, match.index)
            });
        }
        
        // Add highlighted text
        segments.push({
            type: 'highlight',
            color: match[1], // 'yellow' or 'orange'
            text: match[2]
        });
        
        currentPos = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentPos < text.length) {
        segments.push({
            type: 'normal',
            text: text.substring(currentPos)
        });
    }
    
    return segments.length > 0 ? segments : [{ type: 'normal', text: text }];
}

function drawImage(text = '') {
    // Draw dark background
    ctx.fillStyle = '#191919';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw honjitsu logo in top right corner
    if (honjitsuLogo.complete && honjitsuLogo.naturalHeight !== 0) {
        const logoSize = 200; // Adjust size as needed
        const logoX = canvas.width - logoSize - 20;
        const logoY = -15;
        ctx.drawImage(honjitsuLogo, logoX, logoY, logoSize, logoSize);
    }
    
    if (text) {
        const parsedLines = parseMarkdown(text);
        const padding = 48;
        let currentY = padding;
        
        // Calculate starting position based on vertical alignment
        const totalHeight = calculateTotalHeight(parsedLines);
        
        // Ensure we don't go outside canvas bounds
        const availableHeight = canvas.height - (padding * 2);
        const adjustedTotalHeight = Math.min(totalHeight, availableHeight);
        
        switch(textSettings.verticalAlign) {
            case 'top':
                currentY = padding;
                break;
            case 'bottom':
                currentY = Math.max(padding, canvas.height - adjustedTotalHeight - padding);
                break;
            default: // middle
                currentY = Math.max(padding, (canvas.height - adjustedTotalHeight) / 2);
        }
        
        parsedLines.forEach(line => {
            if (line.type === 'title') {
                drawTitle(line, currentY, padding);
                const titleFontSize = textSettings.fontSize + (3 - line.level) * 24;
                currentY += titleFontSize * 1.4 + 10;
            } else if (line.type === 'text' && line.text.trim() !== '') {
                currentY = drawTextLine(line, currentY, padding);
            } else {
                // Empty line
                currentY += textSettings.fontSize * 0.5;
            }
        });
    }
}

function calculateTotalHeight(parsedLines) {
    let totalHeight = 0;
    const padding = 48;
    const maxWidth = canvas.width - (padding * 2);
    
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    
    parsedLines.forEach(line => {
        if (line.type === 'title') {
            const titleFontSize = textSettings.fontSize + (3 - line.level) * 24;
            totalHeight += titleFontSize * 1.4 + 10;
        } else if (line.type === 'text' && line.text.trim() !== '') {
            // Calculate actual wrapped height
            const textParts = [];
            line.segments.forEach(segment => {
                textParts.push({
                    text: segment.text,
                    isHighlight: segment.type === 'highlight',
                    color: segment.color
                });
            });
            
            const wrappedLines = wrapTextWithPreservedHighlights(textParts, maxWidth);
            totalHeight += wrappedLines.length * (textSettings.fontSize * 1.3);
        } else {
            totalHeight += textSettings.fontSize * 0.5;
        }
    });
    
    return totalHeight;
}

function drawTitle(titleLine, y, padding) {
    const titleFontSize = textSettings.fontSize + (3 - titleLine.level) * 24;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px "Arial"`;
    ctx.textBaseline = 'top';
    
    let x;
    if (textSettings.horizontalAlign === 'center') {
        ctx.textAlign = 'center';
        x = canvas.width / 2;
    } else if (textSettings.horizontalAlign === 'right') {
        ctx.textAlign = 'right';
        x = canvas.width - padding;
    } else {
        ctx.textAlign = 'left';
        x = padding;
    }
    
    ctx.fillText(titleLine.text, x, y);
}

function drawTextLine(textLine, y, padding) {
    const lineHeight = textSettings.fontSize * 1.3;
    
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    ctx.textBaseline = 'top';
    
    // Convert segments to a format that preserves highlighting across wrapping
    const textParts = [];
    textLine.segments.forEach(segment => {
        textParts.push({
            text: segment.text,
            isHighlight: segment.type === 'highlight',
            color: segment.color
        });
    });
    
    // Wrap the text while preserving highlight information
    const maxWidth = canvas.width - (padding * 2);
    const wrappedLinesWithHighlights = wrapTextWithPreservedHighlights(textParts, maxWidth);
    
    // Draw each wrapped line
    wrappedLinesWithHighlights.forEach((line, lineIndex) => {
        const currentY = y + (lineIndex * lineHeight);
        
        // Calculate total line width for alignment
        let totalLineWidth = 0;
        line.forEach(part => {
            totalLineWidth += ctx.measureText(part.text).width;
        });
        
        // Calculate starting X position based on alignment
        let startX;
        if (textSettings.horizontalAlign === 'center') {
            startX = Math.max(padding, (canvas.width - totalLineWidth) / 2);
        } else if (textSettings.horizontalAlign === 'right') {
            startX = Math.max(padding, canvas.width - padding - totalLineWidth);
        } else {
            startX = padding;
        }
        
        // Draw this line with preserved highlighting
        drawLineWithPreservedHighlights(line, startX, currentY);
    });
    
    return y + (wrappedLinesWithHighlights.length * lineHeight);
}

function wrapPlainText(text, maxWidth) {
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

function wrapTextWithPreservedHighlights(textParts, maxWidth) {
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;
    
    textParts.forEach(part => {
        if (part.text.trim() === '') return;
        
        const words = part.text.split(' ').filter(word => word !== '');
        
        words.forEach((word, wordIndex) => {
            const needSpace = wordIndex > 0 || currentLine.length > 0;
            const spaceWidth = needSpace ? ctx.measureText(' ').width : 0;
            const wordWidth = ctx.measureText(word).width;
            const totalWidth = spaceWidth + wordWidth;
            
            if (currentLineWidth + totalWidth > maxWidth && currentLine.length > 0) {
                // Start new line
                lines.push([...currentLine]);
                currentLine = [];
                currentLineWidth = 0;
            }
            
            // Add space if needed, but only highlight it if we're within the same highlight segment
            if ((currentLine.length > 0) && needSpace) {
                // Check if the last part in current line has the same highlight as current part
                const lastPart = currentLine[currentLine.length - 1];
                const shouldHighlightSpace = part.isHighlight && lastPart.isHighlight && 
                                           part.color === lastPart.color;
                
                currentLine.push({
                    text: ' ',
                    isHighlight: shouldHighlightSpace,
                    color: shouldHighlightSpace ? part.color : null
                });
                currentLineWidth += spaceWidth;
            }
            
            // Add word
            currentLine.push({
                text: word,
                isHighlight: part.isHighlight,
                color: part.color
            });
            currentLineWidth += wordWidth;
        });
    });
    
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    return lines;
}

function drawLineWithPreservedHighlights(lineParts, startX, y) {
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const safeX = Math.max(0, Math.min(startX, canvas.width));
    const safeY = Math.max(0, Math.min(y, canvas.height));
    
    // First pass: draw all highlight backgrounds
    let currentX = safeX;
    let i = 0;
    
    while (i < lineParts.length) {
        const part = lineParts[i];
        
        if (part.isHighlight) {
            // Find consecutive highlighted parts with the same color
            let groupEnd = i;
            let groupWidth = 0;
            
            while (groupEnd < lineParts.length && 
                   lineParts[groupEnd].isHighlight && 
                   lineParts[groupEnd].color === part.color) {
                groupWidth += ctx.measureText(lineParts[groupEnd].text).width;
                groupEnd++;
            }
            
            // Draw one continuous background for the entire group
            const bgColor = part.color === 'y' ? '#fbc409' : '#ef4f22';
            ctx.fillStyle = bgColor;
            ctx.fillRect(currentX - 2, safeY - 2, groupWidth + 4, textSettings.fontSize + 4);
            
            // Move to the end of this group
            for (let j = i; j < groupEnd; j++) {
                currentX += ctx.measureText(lineParts[j].text).width;
            }
            i = groupEnd;
        } else {
            currentX += ctx.measureText(part.text).width;
            i++;
        }
    }
    
    // Second pass: draw all text
    currentX = safeX;
    lineParts.forEach(part => {
        const textWidth = ctx.measureText(part.text).width;
        
        if (part.isHighlight && part.color === 'y') {
            // Draw text in black over highlight
            ctx.fillStyle = '#000000';
            ctx.fillText(part.text, currentX, safeY);
        } else {
            // Draw normal text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(part.text, currentX, safeY);
        }
        
        currentX += textWidth;
    });
}

function calculateLineWidth(line) {
    // Ensure font is set before measuring
    ctx.font = `400 ${textSettings.fontSize}px "Arial"`;
    let width = 0;
    line.forEach(segment => {
        width += ctx.measureText(segment.text).width;
    });
    return width;
}



// Font size controls
document.getElementById('increaseFontSize').addEventListener('click', () => {
    textSettings.fontSize = Math.min(72, textSettings.fontSize + 2);
    document.getElementById('fontSize').textContent = textSettings.fontSize;
    saveSettingsAndRedraw();
});

document.getElementById('decreaseFontSize').addEventListener('click', () => {
    textSettings.fontSize = Math.max(12, textSettings.fontSize - 2);
    document.getElementById('fontSize').textContent = textSettings.fontSize;
    saveSettingsAndRedraw();
});

// Horizontal alignment controls
document.querySelectorAll('[data-align]').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('[data-align]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        textSettings.horizontalAlign = button.dataset.align;
        saveSettingsAndRedraw();
    });
});

// Vertical alignment controls
document.querySelectorAll('[data-valign]').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('[data-valign]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        textSettings.verticalAlign = button.dataset.valign;
        saveSettingsAndRedraw();
    });
});

function saveSettingsAndRedraw() {
    localStorage.setItem('bluesky-text-settings', JSON.stringify(textSettings));
    drawImage(textInput.value);
}

function generateImage() {
    const text = document.getElementById('textInput').value;
    drawImage(text);
    
    const link = document.createElement('a');
    link.download = 'honjitsu-message.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Update preview as user types
document.getElementById('textInput').addEventListener('input', function(e) {
    const text = e.target.value;
    localStorage.setItem('bluesky-text', text);
    drawImage(text);
});

// Set initial active states for alignment buttons
document.querySelector(`[data-align="${textSettings.horizontalAlign}"]`)?.classList.add('active');
document.querySelector(`[data-valign="${textSettings.verticalAlign}"]`)?.classList.add('active'); 