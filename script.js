const form = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const totalSpendingEl = document.getElementById("total-spending");
const monthlySpendingEl = document.getElementById("monthly-spending");
const dailySpendingEl = document.getElementById("daily-spending");
const budgetInput = document.getElementById("budget-input");
const setBudgetBtn = document.getElementById("set-budget-btn");
const budgetWarning = document.getElementById("budget-warning");
const monthPicker = document.getElementById("month-picker");
const downloadBtn = document.getElementById("download-btn");

let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
let categoryChart, monthlyChart;

const today = new Date();
monthPicker.value = today.toISOString().slice(0, 7);

// 🔹 Load budget for selected month
function loadBudget() {
  const selectedMonth = monthPicker.value;
  budgetInput.value = budgets[selectedMonth] || "";
}

// 🔹 Save budget month-wise
setBudgetBtn.addEventListener("click", () => {
  const selectedMonth = monthPicker.value;
  const value = Number(budgetInput.value);
  if (value > 0) {
    budgets[selectedMonth] = value;
  } else {
    delete budgets[selectedMonth];
  }
  localStorage.setItem("budgets", JSON.stringify(budgets));
  displayExpenses();
});

monthPicker.addEventListener("change", () => {
  loadBudget();
  displayExpenses();
});

// 🔹 Add Expense
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const expense = {
    id: Date.now(),
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
    note: document.getElementById("note").value,
  };

  expenses.push(expense);
  localStorage.setItem("expenses", JSON.stringify(expenses));
  form.reset();
  displayExpenses();
});

// 🔹 Display Expenses
function displayExpenses() {
  expenseList.innerHTML = "";
  const selectedMonth = monthPicker.value;
  const filteredExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));

  filteredExpenses.forEach(exp => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.category}</td>
      <td>₹${exp.amount}</td>
      <td>${exp.note}</td>
      <td><button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button></td>
    `;
    expenseList.appendChild(row);
  });

  updateSummary(filteredExpenses);
  updateCharts(filteredExpenses);
}

// 🔹 Delete Expense
function deleteExpense(id) {
  expenses = expenses.filter(exp => exp.id !== id);
  localStorage.setItem("expenses", JSON.stringify(expenses));
  displayExpenses();
}

// 🔹 Update Summary
function updateSummary(filteredExpenses) {
  let total = 0, dailyTotal = 0;
  const todayDate = new Date().toISOString().split("T")[0];
  const selectedMonth = monthPicker.value;
  const monthlyBudget = budgets[selectedMonth] || 0;

  filteredExpenses.forEach(exp => {
    const amount = Number(exp.amount);
    total += amount;
    if (exp.date === todayDate) dailyTotal += amount;
  });

  totalSpendingEl.textContent = "₹" + total;
  monthlySpendingEl.textContent = "₹" + total;
  dailySpendingEl.textContent = "₹" + dailyTotal;

  if (monthlyBudget > 0 && total > monthlyBudget) {
    budgetWarning.textContent = "⚠ Budget exceeded for this month!";
    budgetWarning.style.color = "red";
  } else if (monthlyBudget > 0) {
    budgetWarning.textContent = "Remaining Budget: ₹" + (monthlyBudget - total);
    budgetWarning.style.color = "green";
  } else {
    budgetWarning.textContent = "";
  }
}

// 🔹 Charts
function updateCharts(filteredExpenses) {
  const categoryTotals = {};
  const monthlyTotals = new Array(12).fill(0);

  filteredExpenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount);
    const month = new Date(exp.date).getMonth();
    monthlyTotals[month] += Number(exp.amount);
  });

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{ data: Object.values(categoryTotals) }]
    }
  });

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{ label: "Monthly Spending", data: monthlyTotals }]
    }
  });
}

// 🔹 DOWNLOAD CSV FEATURE
downloadBtn.addEventListener("click", () => {
  const selectedMonth = monthPicker.value;
  const filteredExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));

  if (filteredExpenses.length === 0) {
    alert("No expenses for this month!");
    return;
  }

  let csv = "Date,Category,Amount,Note\n";

  filteredExpenses.forEach(exp => {
    csv += `${exp.date},${exp.category},${exp.amount},${exp.note}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${selectedMonth}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);
});

// 🔹 AUTO-UPDATE "Today Spending" every minute
setInterval(() => {
  displayExpenses();
}, 60000); // refresh every 60 seconds

loadBudget();
displayExpenses();
