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
const downloadExcelBtn = document.getElementById('download-excel-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};

function saveExpenses(){ localStorage.setItem('expenses', JSON.stringify(expenses)); }
function saveBudgets(){ localStorage.setItem('budgets', JSON.stringify(budgets)); }
function formatDate(date){ return new Date(date).toISOString().split('T')[0]; }
function getSelectedMonth(){ return monthPicker.value ? monthPicker.value : new Date().toISOString().slice(0,7); }

function renderExpenses(){
    const selectedMonth = getSelectedMonth();
    expenseList.innerHTML = '';

    let monthlyTotal = 0, dailyTotal = 0;
    const today = formatDate(new Date());

    expenses.forEach((e,i)=>{
        if(e.date.startsWith(selectedMonth)) monthlyTotal += Number(e.amount);
        if(e.date === today) dailyTotal += Number(e.amount);

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.date}</td><td>${e.category}</td><td>₹${e.amount}</td><td>${e.note||''}</td>
                        <td><button class="delete-btn" data-index="${i}">Delete</button></td>`;
        expenseList.appendChild(tr);
    });

    totalSpendingEl.textContent = `₹${expenses.reduce((a,e)=>a+Number(e.amount),0)}`;
    monthlySpendingEl.textContent = `₹${monthlyTotal}`;
    dailySpendingEl.textContent = `₹${dailyTotal}`;

    updateCharts();
    checkBudget();
}

// ---------------- Add & Delete ----------------
expenseForm.addEventListener('submit', e=>{
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value;

    expenses.push({amount, category, date, note});
    saveExpenses(); renderExpenses(); expenseForm.reset();
});

expenseList.addEventListener('click', e=>{
    if(e.target.classList.contains('delete-btn')){
        expenses.splice(e.target.dataset.index,1);
        saveExpenses(); renderExpenses();
    }
});

monthPicker.addEventListener('change', renderExpenses);
setBudgetBtn.addEventListener('click', ()=>{
    budgets[getSelectedMonth()] = Number(budgetInput.value);
    saveBudgets(); checkBudget();
});

function checkBudget(){
    const selectedMonth = getSelectedMonth();
    const monthlyTotal = expenses.filter(e=>e.date.startsWith(selectedMonth))
        .reduce((a,e)=>a+Number(e.amount),0);
    const budget = budgets[selectedMonth]||0;
    budgetWarning.textContent = budget ? (monthlyTotal>budget ? `⚠️ You exceeded the budget of ₹${budget}!`:`Budget for this month: ₹${budget}`) : '';
}

// ---------------- Charts ----------------
let categoryChart, monthlyChart;
function updateCharts(){
    const selectedMonth = getSelectedMonth();
    const categories = {};
    expenses.filter(e=>e.date.startsWith(selectedMonth)).forEach(e=>{
        categories[e.category] = (categories[e.category]||0)+Number(e.amount);
    });

    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    if(categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx1,{type:'pie',data:{labels:Object.keys(categories),datasets:[{data:Object.values(categories), backgroundColor:['#4a90e2','#27ae60','#f39c12','#e74c3c','#9b59b6']}]}});

    const months=[]; const totals=[];
    const current = new Date();
    for(let i=11;i>=0;i--){
        const d = new Date(current.getFullYear(), current.getMonth()-i,1);
        const key = d.toISOString().slice(0,7);
        months.push(d.toLocaleString('default',{month:'short', year:'2-digit'}));
        totals.push(expenses.filter(e=>e.date.startsWith(key)).reduce((a,e)=>a+Number(e.amount),0));
    }
    const ctx2 = document.getElementById('monthlyChart').getContext('2d');
    if(monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx2,{type:'bar',data:{labels:months,datasets:[{label:'Monthly Spending', data:totals, backgroundColor:'#4a90e2'}]}, options:{responsive:true}});
}

// ---------------- Download Excel ----------------
downloadExcelBtn.addEventListener('click',()=>{
    const selectedMonth = getSelectedMonth();
    const filtered = expenses.filter(e=>e.date.startsWith(selectedMonth));
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `${selectedMonth}-expenses.xlsx`);
});

// ---------------- Download PDF ----------------
downloadPdfBtn.addEventListener('click',()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const selectedMonth = getSelectedMonth();
    const filtered = expenses.filter(e=>e.date.startsWith(selectedMonth));
    let y=10;
    doc.setFontSize(14); doc.text(`Expenses - ${selectedMonth}`,10,y); y+=10;
    filtered.forEach(e=>{
        doc.text(`${e.date} | ${e.category} | ₹${e.amount} | ${e.note||''}`,10,y);
        y+=8;
    });
    doc.save(`${selectedMonth}-expenses.pdf`);
});

// ---------------- Initial Render ----------------
renderExpenses();
