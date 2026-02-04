// ---------------- User Name & Profile Circle ----------------
let username = localStorage.getItem('username') || "";

// Reference
const profileCircle = document.querySelector('.profile-circle');

// --------- First visit: ask for name -----------
if (!username) {
    username = prompt("Welcome! Enter your name:");
    if (!username) username = "User"; // default if blank
    localStorage.setItem('username', username);
}

// Initialize profile circle
profileCircle.textContent = username.charAt(0).toUpperCase();
profileCircle.title = username;

// --------- Later edit: only when user clicks profile -----------
profileCircle.addEventListener('click', () => {
    const newName = prompt("Change your name:", username);
    if (!newName) return; // do nothing if cancelled
    username = newName;
    localStorage.setItem('username', username);
    profileCircle.textContent = username.charAt(0).toUpperCase();
    profileCircle.title = username;
});

// ---------------- Variables ----------------
const expenseForm = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const totalSpendingEl = document.getElementById('total-spending');
const monthlySpendingEl = document.getElementById('monthly-spending');
const dailySpendingEl = document.getElementById('daily-spending');
const monthPicker = document.getElementById('month-picker');
const budgetInput = document.getElementById('budget-input');
const setBudgetBtn = document.getElementById('set-budget-btn');
const budgetWarning = document.getElementById('budget-warning');
const downloadBtn = document.getElementById('download-btn');

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};

// ---------------- Helper Functions ----------------
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function saveBudgets() {
    localStorage.setItem('budgets', JSON.stringify(budgets));
}

function formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function getSelectedMonth() {
    return monthPicker.value ? monthPicker.value : new Date().toISOString().slice(0, 7);
}

// ---------------- Render Functions ----------------
function renderExpenses() {
    const selectedMonth = getSelectedMonth();
    expenseList.innerHTML = '';

    let monthlyTotal = 0;
    let dailyTotal = 0;
    const today = formatDate(new Date());

    expenses.forEach((expense, index) => {
        if (expense.date.startsWith(selectedMonth)) {
            monthlyTotal += Number(expense.amount);
        }
        if (expense.date === today) {
            dailyTotal += Number(expense.amount);
        }

        // Show all expenses
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>₹${expense.amount}</td>
            <td>${expense.note || ''}</td>
            <td><button class="delete-btn" data-index="${index}">Delete</button></td>
        `;
        expenseList.appendChild(tr);
    });

    totalSpendingEl.textContent = `₹${expenses.reduce((acc, e) => acc + Number(e.amount), 0)}`;
    monthlySpendingEl.textContent = `₹${monthlyTotal}`;
    dailySpendingEl.textContent = `₹${dailyTotal}`;

    updateCharts();
    checkBudget();
}

// ---------------- Add Expense ----------------
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value;

    expenses.push({ amount, category, date, note });
    saveExpenses();
    renderExpenses();
    expenseForm.reset();
});

// ---------------- Delete Expense ----------------
expenseList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const index = e.target.dataset.index;
        expenses.splice(index, 1);
        saveExpenses();
        renderExpenses();
    }
});

// ---------------- Month Picker ----------------
monthPicker.addEventListener('change', () => {
    renderExpenses();
});

// ---------------- Budget ----------------
setBudgetBtn.addEventListener('click', () => {
    const selectedMonth = getSelectedMonth();
    budgets[selectedMonth] = Number(budgetInput.value);
    saveBudgets();
    checkBudget();
});

function checkBudget() {
    const selectedMonth = getSelectedMonth();
    const monthlyTotal = expenses
        .filter(e => e.date.startsWith(selectedMonth))
        .reduce((acc, e) => acc + Number(e.amount), 0);

    const budget = budgets[selectedMonth] || 0;
    if (budget && monthlyTotal > budget) {
        budgetWarning.textContent = `⚠️ You exceeded the budget of ₹${budget}!`;
    } else if (budget) {
        budgetWarning.textContent = `Budget for this month: ₹${budget}`;
    } else {
        budgetWarning.textContent = '';
    }
}

// ---------------- Charts ----------------
let categoryChart, monthlyChart;

function updateCharts() {
    const selectedMonth = getSelectedMonth();

    // Category Chart
    const categories = {};
    expenses.filter(e => e.date.startsWith(selectedMonth)).forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
    });

    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                label: 'Category Spending',
                data: Object.values(categories),
                backgroundColor: ['#4a90e2', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6']
            }]
        }
    });

    // Monthly Chart (last 12 months)
    const months = [];
    const totals = [];
    const current = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        const total = expenses.filter(e => e.date.startsWith(key))
            .reduce((acc, e) => acc + Number(e.amount), 0);
        totals.push(total);
    }

    const ctx2 = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Spending',
                data: totals,
                backgroundColor: '#4a90e2'
            }]
        },
        options: {
            responsive: true
        }
    });
}

// ---------------- Download CSV ----------------
downloadBtn.addEventListener('click', () => {
    const selectedMonth = getSelectedMonth();
    const filtered = expenses.filter(e => e.date.startsWith(selectedMonth));

    let csv = 'Date,Category,Amount,Note\n';
    filtered.forEach(e => {
        csv += `${e.date},${e.category},${e.amount},${e.note || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMonth}-expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// ---------------- Initial Render ----------------
renderExpenses();
