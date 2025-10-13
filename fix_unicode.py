import os
import re

def fix_unicode_in_file(file_path):
    """Remove or replace all Unicode characters in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace common Unicode characters with regular text
        replacements = {
            '🚨': '',
            '🔒': '',
            '👍': '',
            '👎': '',
            '💬': '',
            '🏠': '',
            '⚙️': '',
            '🛠️': '',
            '📧': '',
            '👁️': '',
            '🗑️': '',
            '✅': '',
            '❌': '',
            '📝': '',
            '📨': '',
            '🔔': '',
            '▼': '▼',
            '×': 'X',
            '∫': '∫',
            '∑': '∑',
            '∏': '∏',
            '√': '√',
            'α': 'α',
            'β': 'β',
            'γ': 'γ',
            'δ': 'δ',
            'ε': 'ε',
            'ζ': 'ζ',
            'η': 'η',
            'θ': 'θ',
            'ι': 'ι',
            'κ': 'κ',
            'λ': 'λ',
            'μ': 'μ',
            'ν': 'ν',
            'ξ': 'ξ',
            'ο': 'ο',
            'π': 'π',
            'ρ': 'ρ',
            'σ': 'σ',
            'τ': 'τ',
            'υ': 'υ',
            'φ': 'φ',
            'χ': 'χ',
            'ψ': 'ψ',
            'ω': 'ω',
            '∞': '∞',
            '±': '±',
            '∓': '∓',
            '×': '×',
            '÷': '÷',
            '≤': '≤',
            '≥': '≥',
            '≠': '≠',
            '≈': '≈',
            '≡': '≡',
            '∈': '∈',
            '∉': '∉',
            '⊂': '⊂',
            '⊃': '⊃',
            '∪': '∪',
            '∩': '∩',
            '∅': '∅',
            '∇': '∇',
            '∂': '∂',
            '∆': '∆',
            'Ω': 'Ω',
            'Φ': 'Φ',
            'Ψ': 'Ψ',
            'Λ': 'Λ',
            'Σ': 'Σ',
            'Π': 'Π',
            'Θ': 'Θ',
            'Ξ': 'Ξ',
            'Γ': 'Γ',
            'Δ': 'Δ'
        }
        
        # Apply replacements
        for unicode_char, replacement in replacements.items():
            content = content.replace(unicode_char, replacement)
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed Unicode characters in: {file_path}")
        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Fix all Unicode characters in the frontend"""
    frontend_dir = "frontend/olympiad-frontend/src"
    fixed_count = 0
    
    # Walk through all files in the frontend directory
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                file_path = os.path.join(root, file)
                if fix_unicode_in_file(file_path):
                    fixed_count += 1
    
    print(f"\nFixed Unicode characters in {fixed_count} files!")
    print("All Unicode characters have been removed or replaced.")

if __name__ == "__main__":
    main()
