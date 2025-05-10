// Global variables
let currentPlatforms = {};
let accountDetails = {
    idps: [],
    super: []
};

// Number formatting function
function formatCurrency(number) {
    return new Intl.NumberFormat('en-AU', { 
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

// Format number with commas
function formatNumber(number) {
    return new Intl.NumberFormat('en-AU').format(number);
}

// Add commas to input field as user types
function formatInputWithCommas(inputField) {
    // Get current caret position
    let caretPos = inputField.selectionStart;
    let oldLength = inputField.value.length;
    
    // Get value without commas
    let value = inputField.value.replace(/,/g, '');
    
    // Don't format if empty
    if (value === '') return;
    
    // Convert to number and format with commas
    let number = parseFloat(value);
    if (isNaN(number)) {
        inputField.value = '';
        return;
    }
    
    // Format with commas
    let formattedValue = formatNumber(number);
    
    // Update input value
    inputField.value = formattedValue;
    
    // Adjust caret position if needed
    let newLength = inputField.value.length;
    let lengthDiff = newLength - oldLength;
    inputField.setSelectionRange(caretPos + lengthDiff, caretPos + lengthDiff);
}

// Handle input field changes
function handleInputChange(event) {
    const input = event.target;
    formatInputWithCommas(input);
    
    // Extract the account type and index from the input ID
    const idParts = input.id.split('-');
    const accountType = idParts[0]; // 'idps' or 'super'
    const accountIndex = parseInt(idParts[2]) - 1;
    
    // Update account balance (strip commas first)
    const rawValue = input.value.replace(/,/g, '');
    updateAccountDetails(accountType, accountIndex, 'balance', rawValue);
}

// Global data structures with updated fee methodologies
const productFees = {
    "BT Panorama (Compact Menu)": {
        adminFee: function(totalBalance, accountBalance, accountType, allAccounts) {
            // Fixed fee per account
            let fee = 180;
            
            // Calculate total BT balance (combine IDPS and Super)
            let totalBTBalance = 0;
            allAccounts.idps.forEach(account => totalBTBalance += account.balance);
            allAccounts.super.forEach(account => totalBTBalance += account.balance);
            
            // Calculate percentage component based on total balance across all BT accounts
            let percentageFee = 0;
            if (totalBTBalance <= 1000000) {
                percentageFee = totalBTBalance * 0.0015;
            } else {
                percentageFee = 1000000 * 0.0015;
            }
            
            // Allocate percentage fee proportionally based on account balance
            if (totalBTBalance > 0) {
                fee += (accountBalance / totalBTBalance) * percentageFee;
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // $95 fixed plus 0.03% of account balance, per account
            return 95 + (accountBalance * 0.0003);
        }
    },
    "BT Panorama (Full Menu)": {
        adminFee: function(totalBalance, accountBalance, accountType, allAccounts) {
            // Fixed fee per account
            let fee = 540;
            
            // Calculate total BT balance (combine IDPS and Super)
            let totalBTBalance = 0;
            allAccounts.idps.forEach(account => totalBTBalance += account.balance);
            allAccounts.super.forEach(account => totalBTBalance += account.balance);
            
            // Calculate percentage component based on total balance across all BT accounts
            let percentageFee = 0;
            if (totalBTBalance <= 1000000) {
                percentageFee = totalBTBalance * 0.0015;
            } else {
                percentageFee = 1000000 * 0.0015;
            }
            
            // Allocate percentage fee proportionally based on account balance
            if (totalBTBalance > 0) {
                fee += (accountBalance / totalBTBalance) * percentageFee;
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // $95 fixed plus 0.03% of account balance, per account
            return 95 + (accountBalance * 0.0003);
        }
    },
    "Centric IDPS": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Fixed $450 fee per account for IDPS
            return 450;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fees for IDPS Centric
            return 0;
        }
    },
    "Centric Choice": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Fixed $528 admin fee per account
            return 528;
        },
        expenseFee: function(accountBalance) {
            // Fixed $132 expense recovery fee per account
            return 132;
        }
    },
    "Centric One": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // 0.2583% of account balance per account
            return accountBalance * 0.002583;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    },
    "Portfolio Solutions": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            let fee = 0;
            
            if (accountType === 'super') {
                // Tiered fee structure for Super/Pension per account
                if (accountBalance <= 84000) {
                    fee = accountBalance * 0.008929;
                } else if (accountBalance <= 300000) {
                    fee = 84000 * 0.008929 + 0; // Next 216,000 is NIL
                } else if (accountBalance <= 850000) {
                    fee = 84000 * 0.008929 + 0 + (accountBalance - 300000) * 0.0025;
                } else {
                    fee = 84000 * 0.008929 + 0 + 550000 * 0.0025 + 0; // Balance over 850K is 0%
                }
                
                // Minimum fee of $45 per month ($540 per year) applies
                fee = Math.max(fee, 540);
            } else {
                // For IDPS accounts - using the original fee structure as it wasn't updated
                if (accountBalance >= 1000000) {
                    fee = 2125; // Flat fee for balances over $1M
                } else {
                    if (accountBalance <= 84000) {
                        fee = accountBalance * 0.008929;
                    } else if (accountBalance <= 300000) {
                        fee = 84000 * 0.008929 + (Math.min(accountBalance, 300000) - 84000) * 0.00625;
                    } else if (accountBalance <= 500000) {
                        fee = 84000 * 0.008929 + 216000 * 0.00625 + (Math.min(accountBalance, 500000) - 300000) * 0.00375;
                    } else if (accountBalance <= 1000000) {
                        fee = 84000 * 0.008929 + 216000 * 0.00625 + 200000 * 0.00375 + (Math.min(accountBalance, 1000000) - 500000) * 0.00225;
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance, accountType) {
            // $155 per annum fixed plus 0.03% of account balance per account
            return 155 + (accountBalance * 0.0003);
        }
    },
    "CFS Edge Super": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Apply fee structure per account
            let fee = 0;
            
            // First $500,000 at 0.28%
            if (accountBalance <= 500000) {
                fee = accountBalance * 0.0028;
            } else {
                fee = 500000 * 0.0028;
                
                // Next $500,000 at 0.13%
                if (accountBalance <= 1000000) {
                    fee += (accountBalance - 500000) * 0.0013;
                } else {
                    fee += 500000 * 0.0013;
                    
                    // Next $2,000,000 at 0.05%
                    if (accountBalance <= 3000000) {
                        fee += (accountBalance - 1000000) * 0.0005;
                    } else {
                        fee += 2000000 * 0.0005;
                        // Amounts above $3,000,000 at 0%
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    },
    "CFS Edge Investment": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Apply fee structure per account
            let fee = 0;
            
            // First $500,000 at 0.25%
            if (accountBalance <= 500000) {
                fee = accountBalance * 0.0025;
            } else {
                fee = 500000 * 0.0025;
                
                // Next $500,000 at 0.10%
                if (accountBalance <= 1000000) {
                    fee += (accountBalance - 500000) * 0.0010;
                } else {
                    fee += 500000 * 0.0010;
                    
                    // Next $2,000,000 at 0.05%
                    if (accountBalance <= 3000000) {
                        fee += (accountBalance - 1000000) * 0.0005;
                    } else {
                        fee += 2000000 * 0.0005;
                        // Amounts above $3,000,000 at 0%
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    }
};

// Update accounts visibility based on selections
function updateAccountsVisibility() {
    try {
        const idpsAccountCount = document.getElementById('idps-account-count');
        const superAccountCount = document.getElementById('super-account-count');
        
        if (!idpsAccountCount || !superAccountCount) {
            console.error("Account count elements not found");
            return;
        }
        
        const idpsCount = parseInt(idpsAccountCount.value);
        const superCount = parseInt(superAccountCount.value);
        
        // Clear tables
        const idpsTableBody = document.querySelector('#idps-accounts-table tbody');
        const superTableBody = document.querySelector('#super-accounts-table tbody');
        
        if (!idpsTableBody || !superTableBody) {
            console.error("Table body elements not found");
            return;
        }
        
        idpsTableBody.innerHTML = '';
        superTableBody.innerHTML = '';
        
        // Reset account details
        accountDetails = {
            idps: Array(idpsCount).fill().map(() => ({ balance: 0 })),
            super: Array(superCount).fill().map(() => ({ balance: 0 }))
        };
        
        // Show/hide IDPS section
        const idpsSection = document.getElementById('idps-section');
        if (idpsSection) {
            idpsSection.style.display = idpsCount > 0 ? 'block' : 'none';
        }
        
        // Show/hide Super section
        const superSection = document.getElementById('super-section');
        if (superSection) {
            superSection.style.display = superCount > 0 ? 'block' : 'none';
        }
        
        // Add IDPS accounts
        for (let i = 1; i <= idpsCount; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>IDPS Account ${i}</td>
                <td><input type="text" id="idps-balance-${i}" class="input-field" value="0" oninput="handleInputChange(event)"></td>
            `;
            idpsTableBody.appendChild(row);
        }
        
        // Add Super accounts
        for (let i = 1; i <= superCount; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Super/Pension Account ${i}</td>
                <td><input type="text" id="super-balance-${i}" class="input-field" value="0" oninput="handleInputChange(event)"></td>
            `;
            superTableBody.appendChild(row);
        }
        
        // Calculate totals and update footer
        let idpsTotalBalance = 0;
        let superTotalBalance = 0;
        
        accountDetails.idps.forEach(account => {
            idpsTotalBalance += account.balance;
        });
        
        accountDetails.super.forEach(account => {
            superTotalBalance += account.balance;
        });
        
        // Show/hide and update IDPS totals
        const idpsTotals = document.getElementById('idps-totals');
        const idpsTotalBalanceCell = document.getElementById('idps-total-balance');
        
        if (idpsTotals && idpsTotalBalanceCell) {
            if (idpsCount > 1) {
                idpsTotals.style.display = 'table-row-group';
                idpsTotalBalanceCell.textContent = formatCurrency(idpsTotalBalance);
            } else {
                idpsTotals.style.display = 'none';
            }
        }
        
        // Show/hide and update Super totals
        const superTotals = document.getElementById('super-totals');
        const superTotalBalanceCell = document.getElementById('super-total-balance');
        
        if (superTotals && superTotalBalanceCell) {
            if (superCount > 1) {
                superTotals.style.display = 'table-row-group';
                superTotalBalanceCell.textContent = formatCurrency(superTotalBalance);
            } else {
                superTotals.style.display = 'none';
            }
        }
        
        // Initialize account input fields with formatted zeros
        document.querySelectorAll('.input-field[id^="idps-balance-"], .input-field[id^="super-balance-"]').forEach(input => {
            input.value = "0";
        });
        
        // Calculate after all DOM updates
        calculate();
    } catch (error) {
        console.error("Error in updateAccountsVisibility:", error);
    }
}

// Update account details and recalculate
function updateAccountDetails(type, index, field, value) {
    try {
        value = parseFloat(value) || 0;
        accountDetails[type][index][field] = value;
        calculate();
    } catch (error) {
        console.error("Error in updateAccountDetails:", error);
    }
}

// Toggle Current Platform Selector
function toggleCurrentPlatformSelector() {
    try {
        const setCurrentPlatform = document.getElementById('set-current-platform');
        const currentPlatformSelector = document.getElementById('current-platform-selector');
        
        if (!setCurrentPlatform || !currentPlatformSelector) {
            console.error("Required elements not found for toggleCurrentPlatformSelector");
            return;
        }
        
        const isEnabled = setCurrentPlatform.value === 'yes';
        currentPlatformSelector.classList.toggle('hidden', !isEnabled);
        
        if (isEnabled) {
            populatePlatformCheckboxes();
        }
    } catch (error) {
        console.error("Error in toggleCurrentPlatformSelector:", error);
    }
}

// Populate platform checkboxes
function populatePlatformCheckboxes() {
    try {
        const checkboxesContainer = document.getElementById('platform-checkboxes');
        
        if (!checkboxesContainer) {
            console.error("platform-checkboxes element not found");
            return;
        }
        
        checkboxesContainer.innerHTML = '';
        
        // Get all platform names
        const platforms = Object.keys(productFees);
        
        // Add checkbox for each platform
        platforms.forEach(platform => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.style.marginBottom = '0.5rem';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `platform-checkbox-${platform.replace(/\s+/g, '-').replace(/\(/g, '').replace(/\)/g, '')}`;
            checkbox.className = 'platform-checkbox';
            checkbox.value = platform;
            checkbox.checked = currentPlatforms[platform] || false;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = platform;
            label.style.marginLeft = '0.5rem';
            label.style.color = 'var(--text-primary)';
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            checkboxesContainer.appendChild(checkboxDiv);
        });
    } catch (error) {
        console.error("Error in populatePlatformCheckboxes:", error);
    }
}

// Save current platforms
function saveCurrentPlatforms() {
    try {
        // Reset current platforms
        currentPlatforms = {};
        
        // Get all checked platforms
        const checkboxes = document.querySelectorAll('.platform-checkbox:checked');
        checkboxes.forEach(checkbox => {
            currentPlatforms[checkbox.value] = true;
        });
        
        // Show save confirmation
        showSaveConfirmation();
        
        // Recalculate to update display
        calculate();
    } catch (error) {
        console.error("Error in saveCurrentPlatforms:", error);
    }
}

// Show save confirmation
function showSaveConfirmation() {
    try {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.right = '0';
        backdrop.style.bottom = '0';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1000';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.backgroundColor = 'var(--dark-surface)';
        modal.style.padding = '2rem';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '400px';
        
        // Add content
        const title = document.createElement('h3');
        title.textContent = 'Current Platform(s) Saved';
        title.style.marginTop = '0';
        
        const message = document.createElement('p');
        message.textContent = 'Your selection has been saved and the comparison table has been updated.';
        
        const button = document.createElement('button');
        button.textContent = 'OK';
        button.className = 'toggle-button';
        button.style.marginTop = '1rem';
        button.onclick = function() {
            document.body.removeChild(backdrop);
        };
        
        // Assemble modal
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(button);
        backdrop.appendChild(modal);
        
        // Add to document
        document.body.appendChild(backdrop);
        
        // Auto close after 3 seconds
        setTimeout(function() {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
        }, 3000);
    } catch (error) {
        console.error("Error in showSaveConfirmation:", error);
    }
}

// Toggle custom text field based on preference selection
function toggleCustomText() {
    try {
        const preference = document.getElementById('platform-preference');
        const customTextContainer = document.getElementById('custom-text-container');
        const noOnlineText = document.getElementById('no-online-text');
        
        if (!preference || !customTextContainer || !noOnlineText) {
            console.error("Required elements not found for toggleCustomText");
            return;
        }
        
        const preferenceValue = preference.value;
        customTextContainer.classList.toggle('hidden', preferenceValue !== 'custom');
        noOnlineText.classList.toggle('hidden', preferenceValue !== 'no-online');
    } catch (error) {
        console.error("Error in toggleCustomText:", error);
    }
}

// Download comparison data as CSV (Excel)
function downloadComparison() {
    try {
        // Get table data
        const table = document.getElementById('fee-comparison-table');
        if (!table) {
            console.error("Fee comparison table not found");
            return;
        }
        
        const rows = table.querySelectorAll('tr');
        
        // Create CSV content
        let csvContent = "Platform,Admin Fee,Expense Recovery,Total Fee\n";
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = [
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim().replace('$', '').replace(',', ''),
                    cells[2].textContent.trim().replace('$', '').replace(',', ''),
                    cells[3].textContent.trim().replace('$', '').replace(',', '')
                ];
                csvContent += rowData.join(',') + '\n';
            }
        });
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'Platform_Fee_Comparison.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error in downloadComparison:", error);
    }
}

// Download comparison as PDF - Fixed version
function downloadPDF() {
    try {
        // Show loading indication on the button
        const downloadPdfBtn = document.getElementById('download-pdf');
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.innerHTML = 'Generating PDF...';
        downloadPdfBtn.disabled = true;
        
        // Create a new div for the PDF content
        const pdfContent = document.createElement('div');
        
        // Set PDF styles - explicit styling with nothing inherited
        pdfContent.style.width = '100%';
        pdfContent.style.backgroundColor = '#ffffff';
        pdfContent.style.color = '#000000';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
        pdfContent.style.padding = '20px';
        pdfContent.style.boxSizing = 'border-box';
        pdfContent.style.position = 'relative';
        
        // Add title section
        const titleDiv = document.createElement('div');
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.borderBottom = '2px solid #4472C4';
        titleDiv.style.paddingBottom = '10px';
        
        const titleText = document.createElement('h1');
        titleText.textContent = 'Platform Fee Comparison Report';
        titleText.style.margin = '0 0 5px 0';
        titleText.style.padding = '0';
        titleText.style.fontSize = '24px';
        titleText.style.fontWeight = 'bold';
        titleText.style.color = '#333333';
        
        titleDiv.appendChild(titleText);
        pdfContent.appendChild(titleDiv);
        
        // --- ACCOUNT DETAILS SECTION ---
        
        // Get account data
        let idpsAccounts = accountDetails.idps.filter(a => a.balance > 0);
        let superAccounts = accountDetails.super.filter(a => a.balance > 0);
        const totalBalance = [...idpsAccounts, ...superAccounts].reduce((sum, account) => sum + account.balance, 0);
        
        // Add total balance section
        const balanceSection = document.createElement('div');
        balanceSection.style.marginBottom = '20px';
        balanceSection.style.padding = '15px';
        balanceSection.style.backgroundColor = '#f5f5f5';
        balanceSection.style.borderRadius = '5px';
        balanceSection.style.textAlign = 'center';
        
        const balanceTitle = document.createElement('h2');
        balanceTitle.textContent = 'Total Account Balance';
        balanceTitle.style.margin = '0 0 10px 0';
        balanceTitle.style.padding = '0';
        balanceTitle.style.fontSize = '18px';
        balanceTitle.style.fontWeight = 'bold';
        balanceTitle.style.color = '#333333';
        
        const balanceAmount = document.createElement('div');
        balanceAmount.textContent = formatCurrency(totalBalance);
        balanceAmount.style.fontSize = '24px';
        balanceAmount.style.fontWeight = 'bold';
        balanceAmount.style.color = '#4472C4';
        
        balanceSection.appendChild(balanceTitle);
        balanceSection.appendChild(balanceAmount);
        pdfContent.appendChild(balanceSection);
        
        // Create account details section if we have accounts
        if (idpsAccounts.length > 0 || superAccounts.length > 0) {
            const accountsHeader = document.createElement('h2');
            accountsHeader.textContent = 'Account Details';
            accountsHeader.style.margin = '20px 0 15px 0';
            accountsHeader.style.padding = '0';
            accountsHeader.style.fontSize = '18px';
            accountsHeader.style.fontWeight = 'bold';
            accountsHeader.style.color = '#333333';
            accountsHeader.style.borderBottom = '1px solid #dddddd';
            accountsHeader.style.paddingBottom = '5px';
            
            pdfContent.appendChild(accountsHeader);
            
            // Add IDPS accounts table
            if (idpsAccounts.length > 0) {
                // Add subheader
                const idpsHeader = document.createElement('h3');
                idpsHeader.textContent = 'IDPS Accounts';
                idpsHeader.style.margin = '15px 0 10px 0';
                idpsHeader.style.padding = '0';
                idpsHeader.style.fontSize = '16px';
                idpsHeader.style.fontWeight = 'bold';
                idpsHeader.style.color = '#333333';
                
                pdfContent.appendChild(idpsHeader);
                
                // Create table
                const idpsTable = document.createElement('table');
                idpsTable.style.width = '100%';
                idpsTable.style.borderCollapse = 'collapse';
                idpsTable.style.marginBottom = '20px';
                
                // Add header row
                const headerRow = document.createElement('tr');
                
                const accountHeader = document.createElement('th');
                accountHeader.textContent = 'Account';
                accountHeader.style.backgroundColor = '#4472C4';
                accountHeader.style.color = '#ffffff';
                accountHeader.style.padding = '8px';
                accountHeader.style.textAlign = 'left';
                accountHeader.style.border = '1px solid #dddddd';
                accountHeader.style.fontSize = '14px';
                
                const balanceHeader = document.createElement('th');
                balanceHeader.textContent = 'Balance';
                balanceHeader.style.backgroundColor = '#4472C4';
                balanceHeader.style.color = '#ffffff';
                balanceHeader.style.padding = '8px';
                balanceHeader.style.textAlign = 'right';
                balanceHeader.style.border = '1px solid #dddddd';
                balanceHeader.style.fontSize = '14px';
                
                headerRow.appendChild(accountHeader);
                headerRow.appendChild(balanceHeader);
                idpsTable.appendChild(headerRow);
                
                // Add data rows
                let idpsTotalBalance = 0;
                idpsAccounts.forEach((account, index) => {
                    idpsTotalBalance += account.balance;
                    
                    const row = document.createElement('tr');
                    
                    const accountCell = document.createElement('td');
                    accountCell.textContent = `IDPS Account ${index + 1}`;
                    accountCell.style.padding = '8px';
                    accountCell.style.textAlign = 'left';
                    accountCell.style.border = '1px solid #dddddd';
                    accountCell.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    accountCell.style.fontSize = '14px';
                    
                    const balanceCell = document.createElement('td');
                    balanceCell.textContent = formatCurrency(account.balance);
                    balanceCell.style.padding = '8px';
                    balanceCell.style.textAlign = 'right';
                    balanceCell.style.border = '1px solid #dddddd';
                    balanceCell.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    balanceCell.style.fontSize = '14px';
                    
                    row.appendChild(accountCell);
                    row.appendChild(balanceCell);
                    idpsTable.appendChild(row);
                });
                
                // Add total row if multiple accounts
                if (idpsAccounts.length > 1) {
                    const totalRow = document.createElement('tr');
                    
                    const totalLabelCell = document.createElement('td');
                    totalLabelCell.textContent = 'Total IDPS';
                    totalLabelCell.style.padding = '8px';
                    totalLabelCell.style.textAlign = 'left';
                    totalLabelCell.style.border = '1px solid #dddddd';
                    totalLabelCell.style.backgroundColor = '#e9ecef';
                    totalLabelCell.style.fontWeight = 'bold';
                    totalLabelCell.style.fontSize = '14px';
                    
                    const totalValueCell = document.createElement('td');
                    totalValueCell.textContent = formatCurrency(idpsTotalBalance);
                    totalValueCell.style.padding = '8px';
                    totalValueCell.style.textAlign = 'right';
                    totalValueCell.style.border = '1px solid #dddddd';
                    totalValueCell.style.backgroundColor = '#e9ecef';
                    totalValueCell.style.fontWeight = 'bold';
                    totalValueCell.style.fontSize = '14px';
                    
                    totalRow.appendChild(totalLabelCell);
                    totalRow.appendChild(totalValueCell);
                    idpsTable.appendChild(totalRow);
                }
                
                pdfContent.appendChild(idpsTable);
            }
            
            // Add Super accounts table
            if (superAccounts.length > 0) {
                // Add subheader
                const superHeader = document.createElement('h3');
                superHeader.textContent = 'Super/Pension Accounts';
                superHeader.style.margin = '15px 0 10px 0';
                superHeader.style.padding = '0';
                superHeader.style.fontSize = '16px';
                superHeader.style.fontWeight = 'bold';
                superHeader.style.color = '#333333';
                
                pdfContent.appendChild(superHeader);
                
                // Create table
                const superTable = document.createElement('table');
                superTable.style.width = '100%';
                superTable.style.borderCollapse = 'collapse';
                superTable.style.marginBottom = '20px';
                
                // Add header row
                const headerRow = document.createElement('tr');
                
                const accountHeader = document.createElement('th');
                accountHeader.textContent = 'Account';
                accountHeader.style.backgroundColor = '#4472C4';
                accountHeader.style.color = '#ffffff';
                accountHeader.style.padding = '8px';
                accountHeader.style.textAlign = 'left';
                accountHeader.style.border = '1px solid #dddddd';
                accountHeader.style.fontSize = '14px';
                
                const balanceHeader = document.createElement('th');
                balanceHeader.textContent = 'Balance';
                balanceHeader.style.backgroundColor = '#4472C4';
                balanceHeader.style.color = '#ffffff';
                balanceHeader.style.padding = '8px';
                balanceHeader.style.textAlign = 'right';
                balanceHeader.style.border = '1px solid #dddddd';
                balanceHeader.style.fontSize = '14px';
                
                headerRow.appendChild(accountHeader);
                headerRow.appendChild(balanceHeader);
                superTable.appendChild(headerRow);
                
                // Add data rows
                let superTotalBalance = 0;
                superAccounts.forEach((account, index) => {
                    superTotalBalance += account.balance;
                    
                    const row = document.createElement('tr');
                    
                    const accountCell = document.createElement('td');
                    accountCell.textContent = `Super/Pension Account ${index + 1}`;
                    accountCell.style.padding = '8px';
                    accountCell.style.textAlign = 'left';
                    accountCell.style.border = '1px solid #dddddd';
                    accountCell.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    accountCell.style.fontSize = '14px';
                    
                    const balanceCell = document.createElement('td');
                    balanceCell.textContent = formatCurrency(account.balance);
                    balanceCell.style.padding = '8px';
                    balanceCell.style.textAlign = 'right';
                    balanceCell.style.border = '1px solid #dddddd';
                    balanceCell.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    balanceCell.style.fontSize = '14px';
                    
                    row.appendChild(accountCell);
                    row.appendChild(balanceCell);
                    superTable.appendChild(row);
                });
                
                // Add total row if multiple accounts
                if (superAccounts.length > 1) {
                    const totalRow = document.createElement('tr');
                    
                    const totalLabelCell = document.createElement('td');
                    totalLabelCell.textContent = 'Total Super/Pension';
                    totalLabelCell.style.padding = '8px';
                    totalLabelCell.style.textAlign = 'left';
                    totalLabelCell.style.border = '1px solid #dddddd';
                    totalLabelCell.style.backgroundColor = '#e9ecef';
                    totalLabelCell.style.fontWeight = 'bold';
                    totalLabelCell.style.fontSize = '14px';
                    
                    const totalValueCell = document.createElement('td');
                    totalValueCell.textContent = formatCurrency(superTotalBalance);
                    totalValueCell.style.padding = '8px';
                    totalValueCell.style.textAlign = 'right';
                    totalValueCell.style.border = '1px solid #dddddd';
                    totalValueCell.style.backgroundColor = '#e9ecef';
                    totalValueCell.style.fontWeight = 'bold';
                    totalValueCell.style.fontSize = '14px';
                    
                    totalRow.appendChild(totalLabelCell);
                    totalRow.appendChild(totalValueCell);
                    superTable.appendChild(totalRow);
                }
                
                pdfContent.appendChild(superTable);
            }
        }
        
        // Add client preference information
        const preferenceValue = document.getElementById('platform-preference').value;
        if (preferenceValue !== 'standard') {
            const prefDiv = document.createElement('div');
            prefDiv.style.marginBottom = '20px';
            prefDiv.style.padding = '10px 15px';
            prefDiv.style.backgroundColor = '#f8f9fa';
            prefDiv.style.border = '1px solid #dddddd';
            prefDiv.style.borderRadius = '5px';
            
            const prefTitle = document.createElement('h3');
            prefTitle.textContent = 'Client Platform Preference';
            prefTitle.style.margin = '0 0 10px 0';
            prefTitle.style.padding = '0';
            prefTitle.style.fontSize = '16px';
            prefTitle.style.fontWeight = 'bold';
            prefTitle.style.color = '#333333';
            
            const prefText = document.createElement('p');
            prefText.style.margin = '0';
            prefText.style.padding = '0';
            prefText.style.fontSize = '14px';
            prefText.style.color = '#333333';
            
            if (preferenceValue === 'no-online') {
                prefText.textContent = 'The client has expressed a desire to use a simple platform without online complexity.';
            } else if (preferenceValue === 'custom') {
                const customText = document.getElementById('custom-preference-text').value;
                prefText.textContent = customText || 'Custom preference (no details provided).';
            }
            
            prefDiv.appendChild(prefTitle);
            prefDiv.appendChild(prefText);
            pdfContent.appendChild(prefDiv);
        }
        
        // --- FEE COMPARISON TABLE SECTION ---
        
        // Add section header
        const feeComparisonHeader = document.createElement('h2');
        feeComparisonHeader.textContent = 'Fee Comparison Results';
        feeComparisonHeader.style.margin = '25px 0 15px 0';
        feeComparisonHeader.style.padding = '0';
        feeComparisonHeader.style.fontSize = '18px';
        feeComparisonHeader.style.fontWeight = 'bold';
        feeComparisonHeader.style.color = '#333333';
        feeComparisonHeader.style.borderBottom = '1px solid #dddddd';
        feeComparisonHeader.style.paddingBottom = '5px';
        
        pdfContent.appendChild(feeComparisonHeader);
        
        // Create fee comparison table from scratch
        const feeTable = document.createElement('table');
        feeTable.style.width = '100%';
        feeTable.style.borderCollapse = 'collapse';
        feeTable.style.marginBottom = '20px';
        
        // Create header row
        const feeHeaderRow = document.createElement('tr');
        
        // Define headers
        const headers = ['Platform', 'Admin Fee ($)', 'Expense Recovery ($)', 'Total Fee ($)'];
        headers.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.backgroundColor = '#4472C4';
            th.style.color = '#ffffff';
            th.style.padding = '8px';
            th.style.textAlign = index === 0 ? 'left' : 'right';
            th.style.border = '1px solid #dddddd';
            th.style.fontSize = '14px';
            feeHeaderRow.appendChild(th);
        });
        
        feeTable.appendChild(feeHeaderRow);
        
        // Get fee data from original table
        const originalTable = document.getElementById('fee-comparison-table');
        const originalRows = originalTable.querySelectorAll('tr');
        
        // Add data rows
        originalRows.forEach((origRow, rowIndex) => {
            const cells = origRow.querySelectorAll('td');
            if (cells.length === 0) return;
            
            const isCurrentPlatform = origRow.classList.contains('current-platform');
            
            const newRow = document.createElement('tr');
            
            // Create cells
            for (let i = 0; i < cells.length; i++) {
                const td = document.createElement('td');
                td.textContent = cells[i].textContent;
                td.style.padding = '8px';
                td.style.textAlign = i === 0 ? 'left' : 'right';
                td.style.border = '1px solid #dddddd';
                td.style.fontSize = '14px';
                
                // Special formatting for current platform
                if (isCurrentPlatform) {
                    td.style.backgroundColor = '#e2f0d9'; // Light green
                    td.style.fontWeight = 'bold';
                    
                    // Add left border for first cell to indicate current platform
                    if (i === 0) {
                        td.style.borderLeft = '4px solid #70ad47';
                    }
                } else {
                    td.style.backgroundColor = rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff';
                }
                
                newRow.appendChild(td);
            }
            
            feeTable.appendChild(newRow);
        });
        
        pdfContent.appendChild(feeTable);
        
        // --- NOTES SECTION ---
        
        // Add notes header
        const notesHeader = document.createElement('h2');
        notesHeader.textContent = 'Notes';
        notesHeader.style.margin = '25px 0 15px 0';
        notesHeader.style.padding = '0';
        notesHeader.style.fontSize = '16px';
        notesHeader.style.fontWeight = 'bold';
        notesHeader.style.color = '#333333';
        
        pdfContent.appendChild(notesHeader);
        
        // Create notes list
        const notesList = document.createElement('ul');
        notesList.style.margin = '0 0 20px 0';
        notesList.style.paddingLeft = '20px';
        
        // Add notes from original page
        const originalNotes = document.querySelectorAll('.note p');
        originalNotes.forEach(note => {
            const li = document.createElement('li');
            li.textContent = note.textContent;
            li.style.margin = '0 0 8px 0';
            li.style.padding = '0';
            li.style.fontSize = '12px';
            li.style.color = '#555555';
            notesList.appendChild(li);
        });
        
        pdfContent.appendChild(notesList);
        
        // --- FOOTER ---
        
        // Add footer with date and disclaimer
        const footer = document.createElement('div');
        footer.style.marginTop = '30px';
        footer.style.paddingTop = '10px';
        footer.style.borderTop = '1px solid #dddddd';
        footer.style.fontSize = '11px';
        footer.style.color = '#666666';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        
        const dateInfo = document.createElement('div');
        const currentDate = new Date();
        dateInfo.textContent = `Report generated on: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`;
        
        const disclaimer = document.createElement('div');
        disclaimer.textContent = 'This comparison is for informational purposes only and should not be considered as financial advice.';
        
        footer.appendChild(dateInfo);
        footer.appendChild(disclaimer);
        pdfContent.appendChild(footer);
        
        // Add the content to the document temporarily
        document.body.appendChild(pdfContent);
        
        // Define PDF options - simplified for more reliable rendering
        const options = {
            margin: 10,
            filename: 'Platform_Fee_Comparison.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            }
        };
        
        // Generate the PDF
        html2pdf()
            .from(pdfContent)
            .set(options)
            .save()
            .then(() => {
                // Restore button state
                downloadPdfBtn.innerHTML = originalText;
                downloadPdfBtn.disabled = false;
                
                // Remove the temporary element
                document.body.removeChild(pdfContent);
            })
            .catch(error => {
                console.error("Error generating PDF:", error);
                downloadPdfBtn.innerHTML = originalText;
                downloadPdfBtn.disabled = false;
                
                // Remove the temporary element
                if (document.body.contains(pdfContent)) {
                    document.body.removeChild(pdfContent);
                }
                
                alert('An error occurred while generating the PDF. Please try again.');
            });
            
    } catch (error) {
        console.error("Error in downloadPDF:", error);
        
        // Restore button state on error
        const downloadPdfBtn = document.getElementById('download-pdf');
        if (downloadPdfBtn) {
            downloadPdfBtn.innerHTML = 'Download as PDF';
            downloadPdfBtn.disabled = false;
        }
        
        // Show error to user
        alert('An error occurred while generating the PDF. Please try again.');
    }
}

// Calculate fees for a specific platform
function calculatePlatformFees(platform, allAccounts) {
    let totalAdminFee = 0;
    let totalExpenseFee = 0;
    
    // Calculate fees for IDPS accounts
    allAccounts.idps.forEach(account => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Super" && account.balance > 0) {
                platformToUse = "CFS Edge Investment";
            } else if (platform === "CFS Edge Investment" && allAccounts.super.length > 0 && allAccounts.super.some(a => a.balance > 0)) {
                // Skip for now, we'll calculate CFS Edge Investment fees separately
                return;
            } else if (platform === "Centric One") {
                // Centric One is only for Super accounts
                return;
            }
            
            if (productFees[platformToUse]) {
                totalAdminFee += productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'idps',
                    allAccounts
                );
                
                totalExpenseFee += productFees[platformToUse].expenseFee(
                    account.balance,
                    'idps'
                );
            }
        }
    });
    
    // Calculate fees for Super accounts
    allAccounts.super.forEach(account => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Investment" && account.balance > 0) {
                platformToUse = "CFS Edge Super";
            } else if (platform === "Centric IDPS") {
                platformToUse = "Centric Choice";
            }
            
            if (productFees[platformToUse]) {
                totalAdminFee += productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'super',
                    allAccounts
                );
                
                totalExpenseFee += productFees[platformToUse].expenseFee(
                    account.balance,
                    'super'
                );
            }
        }
    });
    
    return {
        adminFee: totalAdminFee,
        expenseFee: totalExpenseFee,
        totalFee: totalAdminFee + totalExpenseFee
    };
}

// Main calculation function
function calculate() {
    try {
        // Get total balances
        let totalIdpsBalance = 0;
        let totalSuperBalance = 0;
        
        // Process IDPS accounts
        if (accountDetails && accountDetails.idps) {
            accountDetails.idps.forEach(account => {
                totalIdpsBalance += account.balance;
            });
        }
        
        // Process Super accounts
        if (accountDetails && accountDetails.super) {
            accountDetails.super.forEach(account => {
                totalSuperBalance += account.balance;
            });
        }
        
        const totalBalance = totalIdpsBalance + totalSuperBalance;
        
        // Update total balance display
        const totalBalanceElement = document.getElementById('total-balance-amount');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = formatCurrency(totalBalance);
        }
        
        // Update the header text based on number of accounts
        const totalAccountsHeader = document.querySelector('.total-balance-display h3');
        if (totalAccountsHeader) {
            const accountCount = (accountDetails.idps ? accountDetails.idps.length : 0) + 
                                 (accountDetails.super ? accountDetails.super.length : 0);
            const activeAccountCount = (accountDetails.idps ? accountDetails.idps.filter(a => a.balance > 0).length : 0) + 
                                      (accountDetails.super ? accountDetails.super.filter(a => a.balance > 0).length : 0);
            
            if (activeAccountCount > 1) {
                totalAccountsHeader.textContent = "Total Account Balances";
            } else {
                totalAccountsHeader.textContent = "Total Account Balance";
            }
        }
        
        // Clear fee comparison table
        const feeComparisonTable = document.getElementById('fee-comparison-table');
        if (!feeComparisonTable) {
            console.error("Fee comparison table not found");
            return;
        }
        
        feeComparisonTable.innerHTML = '';
        
        // Skip if no accounts or balances
        if (totalBalance === 0) {
            feeComparisonTable.innerHTML = '<tr><td colspan="4">Please add account details to see fee comparisons.</td></tr>';
            return;
        }
        
        // Define available platforms
        let platformsData = [];
        
        // Add platforms based on account types
        let availablePlatforms = [];
        
        // Check if there are IDPS accounts
        const hasIdps = totalIdpsBalance > 0;
        
        // Check if there are Super accounts
        const hasSuper = totalSuperBalance > 0;
        
        if (hasIdps && !hasSuper) {
            // IDPS only
            availablePlatforms = [
                "Centric IDPS",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Investment"
            ];
        } else if (!hasIdps && hasSuper) {
            // Super only
            availablePlatforms = [
                "Centric Choice",
                "Centric One",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Super"
            ];
        } else if (hasIdps && hasSuper) {
            // Both IDPS and Super
            availablePlatforms = [
                "Centric IDPS", // Will use Centric Choice for Super accounts
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Investment" // Will use CFS Edge Super for Super accounts
            ];
        }
        
        // Ensure currentPlatforms is initialized
        if (!currentPlatforms) {
            currentPlatforms = {};
        }
        
        // Calculate fees for each platform
        availablePlatforms.forEach(platform => {
            const fees = calculatePlatformFees(platform, accountDetails);
            
            platformsData.push({
                name: platform,
                adminFee: fees.adminFee,
                expenseFee: fees.expenseFee,
                totalFee: fees.totalFee,
                isCurrent: currentPlatforms[platform] || false
            });
        });
        
        // Update checkboxes if the selector is visible
        if (document.getElementById('set-current-platform') && 
            document.getElementById('set-current-platform').value === 'yes') {
            populatePlatformCheckboxes();
        }
        
        // Separate current platforms and other platforms
        const currentPlatformsData = platformsData.filter(p => p.isCurrent);
        const otherPlatformsData = platformsData.filter(p => !p.isCurrent);
        
        // Sort other platforms by total fee (cheapest first)
        otherPlatformsData.sort((a, b) => a.totalFee - b.totalFee);
        
        // Combine them with current platforms at the top
        platformsData = [...currentPlatformsData, ...otherPlatformsData];
        
        // Add rows to table
        platformsData.forEach(platform => {
            const row = document.createElement('tr');
            row.className = platform.isCurrent ? 'current-platform' : '';
            
            row.innerHTML = `
                <td>${platform.name}${platform.isCurrent ? ' (Current)' : ''}</td>
                <td>${formatCurrency(platform.adminFee)}</td>
                <td>${formatCurrency(platform.expenseFee)}</td>
                <td>${formatCurrency(platform.totalFee)}</td>
            `;
            
            feeComparisonTable.appendChild(row);
        });
        
        // Update IDPS and Super totals if needed
        const idpsTotalBalanceCell = document.getElementById('idps-total-balance');
        if (idpsTotalBalanceCell) {
            idpsTotalBalanceCell.textContent = formatCurrency(totalIdpsBalance);
        }
        
        const superTotalBalanceCell = document.getElementById('super-total-balance');
        if (superTotalBalanceCell) {
            superTotalBalanceCell.textContent = formatCurrency(totalSuperBalance);
        }
    } catch (error) {
        console.error("Error in calculate function:", error);
    }
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Set up event listeners
        document.getElementById('update-accounts-btn').addEventListener('click', updateAccountsVisibility);
        document.getElementById('set-current-platform').addEventListener('change', toggleCurrentPlatformSelector);
        document.getElementById('platform-preference').addEventListener('change', toggleCustomText);
        document.getElementById('save-current-platforms').addEventListener('click', saveCurrentPlatforms);
        
        // Update download listeners
        document.getElementById('download-csv').addEventListener('click', downloadComparison);
        document.getElementById('download-pdf').addEventListener('click', downloadPDF);
        
        // Initialize the UI
        toggleCustomText();
    } catch (error) {
        console.error("Error in initialization:", error);
    }
});
