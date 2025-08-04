let foods = [];
let records = JSON.parse(localStorage.getItem('records')) || {};
let pfcChart = null;
let kcalChart = null;

fetch('food_data.json')
  .then(response => response.json())
  .then(data => {
    foods = data;
    const select = document.getElementById('foodSelect');
    foods.forEach(f => {
      const option = document.createElement('option');
      option.value = f.name;
      option.textContent = f.name;
      select.appendChild(option);
    });
  });

document.getElementById('foodSelect').addEventListener('change', () => {
  const selected = document.getElementById('foodSelect').value;
  const food = foods.find(f => f.name === selected);
  document.getElementById('unit').textContent = food ? food.unit : '';
});

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function addFood() {
  const foodName = document.getElementById('foodSelect').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  const food = foods.find(f => f.name === foodName);

  if (!food || isNaN(quantity)) return;

  const protein = food.protein * quantity;
  const fat = food.fat * quantity;
  const carbs = food.carbs * quantity;
  const calories = food.calories * quantity;

  const today = getToday();
  if (!records[today]) records[today] = [];

  records[today].push({
    id: Date.now(),
    name: foodName,
    quantity: quantity,
    unit: food.unit,
    protein,
    fat,
    carbs,
    calories
  });

  localStorage.setItem('records', JSON.stringify(records));
  updateTotal();
  updateHistory();
  updateCharts();
}

function deleteRecord(date, id) {
  records[date] = records[date].filter(r => r.id !== id);
  localStorage.setItem('records', JSON.stringify(records));
  updateTotal();
  updateHistory();
  updateCharts();
}

function updateTotal() {
  const today = getToday();
  const todayRecords = records[today] || [];

  let totalP = 0, totalF = 0, totalC = 0, totalCal = 0;

  todayRecords.forEach(r => {
    totalP += r.protein;
    totalF += r.fat;
    totalC += r.carbs;
    totalCal += r.calories;
  });

  document.getElementById('total').textContent =
    `今日の合計: P=${totalP.toFixed(1)}g, F=${totalF.toFixed(1)}g, C=${totalC.toFixed(1)}g, kcal=${totalCal.toFixed(0)}`;
}

function updateHistory() {
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = '';

  Object.keys(records).sort().reverse().forEach(date => {
    const dayRecords = records[date];
    const dayDiv = document.createElement('div');
    const dayHeader = document.createElement('h3');
    dayHeader.textContent = date;
    dayDiv.appendChild(dayHeader);

    dayRecords.forEach(r => {
      const p = document.createElement('p');
      p.textContent = `${r.name} ${r.quantity}${r.unit} (P:${r.protein.toFixed(1)} F:${r.fat.toFixed(1)} C:${r.carbs.toFixed(1)} kcal:${r.calories.toFixed(0)})`;

      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.onclick = () => deleteRecord(date, r.id);

      p.appendChild(delBtn);
      dayDiv.appendChild(p);
    });

    historyDiv.appendChild(dayDiv);
  });
}

function updateCharts() {
  const today = getToday();
  const todayRecords = records[today] || [];

  let totalP = 0, totalF = 0, totalC = 0;
  todayRecords.forEach(r => {
    totalP += r.protein;
    totalF += r.fat;
    totalC += r.carbs;
  });

  if (pfcChart) pfcChart.destroy();
  const ctx = document.getElementById('pfcChart').getContext('2d');

  pfcChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Protein', 'Fat', 'Carbs'],
      datasets: [{
        data: [totalP, totalF, totalC],
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56']
      }]
    },
    options: {
      plugins: {
        datalabels: {
          formatter: (value, ctx) => {
            const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / sum) * 100).toFixed(1) + "%";
            return percentage;
          },
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // カロリー推移（オマケ：折れ線グラフ）
  if (kcalChart) kcalChart.destroy();
  const kcalCtx = document.getElementById('kcalChart').getContext('2d');

  const dates = Object.keys(records).sort();
  const kcalData = dates.map(d =>
    records[d].reduce((sum, r) => sum + r.calories, 0)
  );

  kcalChart = new Chart(kcalCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'kcal',
        data: kcalData,
        borderColor: '#36A2EB',
        backgroundColor: '#9BD0F5',
        fill: true,
        tension: 0.2,
        pointRadius: 4
      }]
    }
  });
}

// 初期化
updateTotal();
updateHistory();
updateCharts();
