// ----- Select elements -----
const expenseForm = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');

const totalSpending = document.getElementById('total-spending');
const monthlySpending = document.getElementById('monthly-spending');
const dailySpending = document.getElementById('daily-spending');

const expenseList = document.getElementById('expense-list');
const monthPicker = document.getElementById('month-picker');
const budgetInput = document.getElementById('budget-input');
const setBudgetBtn = document.getElementById('set-budget-btn');
const budgetWarning = document.getElementById('budget-warning');

const downloadBtn = document.getElementById('download-report-btn');
const downloadMenu = document.getElementById('download-menu');
const menuDownloadBtn = document.getElementById('menu-download-btn');
const menuReportType = document.getElementById('menu-report-type');
const menuFormat = document.getElementById('menu-format');

// Charts
let categoryChart, monthlyChart;

// ----- Data -----
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let monthlyBudget = Number(localStorage.getItem('monthlyBudget')) || 0;

// ----- Functions -----

function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('monthlyBudget', monthlyBudget);
}

function updateSummary() {
    const today = new Date().toISOString().slice(0,10);
    const month = monthPicker.value || today.slice(0,7);

    let total = 0, monthTotal = 0, todayTotal = 0;

    expenses.forEach(exp => {
        total += Number(exp.amount);
        if(exp.date.startsWith(month)) monthTotal += Number(exp.amount);
        if(exp.date === today) todayTotal += Number(exp.amount);
    });

    totalSpending.textContent = `₹${total}`;
    monthlySpending.textContent = `₹${monthTotal}`;
    dailySpending.textContent = `₹${todayTotal}`;

    // Budget warning
    if(monthlyBudget && monthTotal > monthlyBudget) {
        budgetWarning.textContent = `⚠️ You have exceeded your monthly budget!`;
    } else {
        budgetWarning.textContent = '';
    }
}

function renderExpenses() {
    expenseList.innerHTML = '';
    const month = monthPicker.value;
    const filtered = month ? expenses.filter(exp => exp.date.startsWith(month)) : expenses;

    filtered.forEach((exp,index)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>₹${exp.amount}</td>
            <td>${exp.note}</td>
            <td><button class="delete-btn" data-index="${index}">Delete</button></td>
        `;
        expenseList.appendChild(tr);
    });
}

function renderCharts() {
    // Category Chart
    const month = monthPicker.value;
    const filtered = month ? expenses.filter(exp => exp.date.startsWith(month)) : expenses;
    const categoryData = {};
    filtered.forEach(exp=>{
        if(categoryData[exp.category]) categoryData[exp.category] += Number(exp.amount);
        else categoryData[exp.category] = Number(exp.amount);
    });

    const categoryLabels = Object.keys(categoryData);
    const categoryValues = Object.values(categoryData);

    if(categoryChart) categoryChart.destroy();
    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctx1,{
        type:'pie',
        data:{
            labels: categoryLabels,
            datasets:[{
                data: categoryValues,
                backgroundColor: ['#4a90e2','#27ae60','#f39c12','#9b59b6','#e74c3c']
            }]
        },
        options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
    });

    // Monthly Chart
    const monthMap = {};
    filtered.forEach(exp=>{
        const day = exp.date.slice(-2);
        if(monthMap[day]) monthMap[day] += Number(exp.amount);
        else monthMap[day] = Number(exp.amount);
    });

    const days = Object.keys(monthMap);
    const dayValues = Object.values(monthMap);

    if(monthlyChart) monthlyChart.destroy();
    const ctx2 = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(ctx2,{
        type:'bar',
        data:{
            labels: days,
            datasets:[{ label:'Daily Spending', data:dayValues, backgroundColor:'#4a90e2' }]
        },
        options:{ responsive:true, plugins:{ legend:{ display:false } } }
    });
}

// ----- Event Listeners -----

expenseForm.addEventListener('submit', e=>{
    e.preventDefault();
    const expense = {
        amount: amountInput.value,
        category: categoryInput.value,
        date: dateInput.value,
        note: noteInput.value
    };
    expenses.push(expense);
    saveData();
    updateSummary();
    renderExpenses();
    renderCharts();
    expenseForm.reset();
});

expenseList.addEventListener('click', e=>{
    if(e.target.classList.contains('delete-btn')){
        const index = e.target.dataset.index;
        expenses.splice(index,1);
        saveData();
        updateSummary();
        renderExpenses();
        renderCharts();
    }
});

monthPicker.addEventListener('change', ()=>{
    renderExpenses();
    renderCharts();
    updateSummary();
});

setBudgetBtn.addEventListener('click', ()=>{
    monthlyBudget = Number(budgetInput.value);
    localStorage.setItem('monthlyBudget', monthlyBudget);
    updateSummary();
    budgetInput.value = '';
});

// Download menu
downloadBtn.addEventListener('click', ()=>{ downloadMenu.style.display = downloadMenu.style.display==='block'?'none':'block'; });

menuDownloadBtn.addEventListener('click', ()=>{
    const reportType = menuReportType.value;
    const format = menuFormat.value;

    let data = expenses;
    const today = new Date().toISOString().slice(0,10);

    if(reportType==='today') data = expenses.filter(e=>e.date===today);
    else if(reportType==='month') {
        const month = monthPicker.value || today.slice(0,7);
        data = expenses.filter(e=>e.date.startsWith(month));
    }
    // else week / all (all already)

    if(format==='excel') downloadExcel(data);
    else downloadPDF(data);

    downloadMenu.style.display='none';
});

// ----- Download Functions -----
function downloadExcel(data){
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb,"Expense_Report.xlsx");
}

function downloadPDF(data){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(14);
    doc.text("Expense Report", 14, y);
    y+=10;
    data.forEach(exp=>{
        doc.text(`${exp.date} | ${exp.category} | ₹${exp.amount} | ${exp.note}`, 14, y);
        y+=7;
    });
    doc.save("Expense_Report.pdf");
}

// ----- Init -----
updateSummary();
renderExpenses();
renderCharts();
