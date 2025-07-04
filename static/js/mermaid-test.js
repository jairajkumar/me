// Mermaid Theme Test and Debug Script
console.log('🧪 Mermaid Test Script Loaded');

// Test function to check Mermaid status
function testMermaidStatus() {
    console.log('--- Mermaid Status Check ---');
    console.log('Mermaid loaded:', typeof mermaid !== 'undefined');
    console.log('Current theme:', document.body.classList.contains('dark') ? 'dark' : 'light');
    
    const diagrams = document.querySelectorAll('.mermaid');
    console.log('Total diagrams found:', diagrams.length);
    
    diagrams.forEach((diagram, index) => {
        const hasSvg = diagram.querySelector('svg') !== null;
        const hasContent = diagram.textContent.trim().length > 0;
        console.log(`Diagram ${index + 1}: SVG=${hasSvg}, Content=${hasContent}`);
    });
}

// Run test after page loads
window.addEventListener('load', () => {
    setTimeout(testMermaidStatus, 1000);
});

// Test theme toggle
window.testThemeToggle = function() {
    console.log('🎨 Testing theme toggle...');
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.click();
        setTimeout(() => {
            console.log('Theme after toggle:', document.body.classList.contains('dark') ? 'dark' : 'light');
            testMermaidStatus();
        }, 500);
    } else {
        console.log('❌ Theme toggle button not found');
    }
};

// Manual re-render function for testing
window.testMermaidRerender = function() {
    console.log('🔄 Manually triggering Mermaid re-render...');
    if (typeof reRenderMermaidDiagrams === 'function') {
        reRenderMermaidDiagrams();
    } else {
        console.log('❌ reRenderMermaidDiagrams function not available');
    }
};

// Force refresh all diagrams with improved theme
window.forceRefreshDiagrams = function() {
    console.log('🎨 Force refreshing all diagrams with improved theme...');
    if (typeof isThemeChanging !== 'undefined') {
        // Temporarily override the theme changing flag
        const originalFlag = isThemeChanging;
        isThemeChanging = false;
        
        if (typeof reRenderMermaidDiagrams === 'function') {
            reRenderMermaidDiagrams();
        }
        
        // Restore original flag after a delay
        setTimeout(() => {
            isThemeChanging = originalFlag;
        }, 1000);
    }
};

// Auto-refresh diagrams when this script loads (for immediate improvement)
setTimeout(() => {
    if (document.body.classList.contains('dark')) {
        console.log('🌙 Dark mode detected, refreshing diagrams for better appearance...');
        window.forceRefreshDiagrams();
    }
}, 2000);

console.log('🔧 Test functions available:');
console.log('- testThemeToggle(): Test theme switching');
console.log('- testMermaidRerender(): Manually re-render diagrams');
console.log('- forceRefreshDiagrams(): Force refresh with improved theme');
console.log('- testMermaidStatus(): Check current status'); 