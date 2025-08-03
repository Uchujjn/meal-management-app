let foods = [];
let records = JSON.parse(localStorage.getItem('records')) || {};
let kcalChart;
let pfcChart;

// 食材データを読み込む
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

    if (foods.length > 0) {
      select.value = foods[0].name;
      document.getElementById('unit').textContent = foods[0].unit;
    }

    updateTotal();
    updateHistory();
    updateCharts();
  });

// 食材選択時に単位をセット
document.getElementById('foodSelect').addEventListener('change', () => {
  const selected = document.getElementById('foodSelect').value;
  const food = foods.find(f => f.name === selected);
  document.getElementById('unit').textContent = food ? food.unit : '';
});

// 今日の日付を取得
function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// 食材を追加
function addFood() {
  const foodName = document.getElementById('foodSelect').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  const unit = document.getElementById('unit').textContent;

  if (!quantity || quantity <= 0) return alert("量を正しく入力してください");

  const food = foods.find(f => f.name === foodName);
  if (!food) return alert("食材が見つかりません");

  const factor = quantity;

  const today = getToday();
  if (!records[today]) records[today] = [];

  records[today].push({
    id: Date.now(),
    name: foodName,
    quantity: quantity,
    unit: unit,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor,
    calories: food.calories * factor
  });

  localStorage.setItem('records', JSON.stringify(records));

  updateTotal();
  updateHistory();
  updateCharts();

  document.getElementById('quantity').value = '';
}

// 今日の合計を更新
function updateTotal() {
  let total = { protein: 0, fat: 0, carbs: 0, calories: 0 };
  const today = getToday();

  if (records[today]) {
    records[today].forEach(item => {
      total.protein += item.protein;
      total.fat += item.fat;
      total.carbs += item.carbs;
      total.calories += item.calories;
    });
  }

  document.getElementById('total').innerHTML = `
    【今日の合計】<br>
    P: ${total.protein.toFixed(1)}g<br>
    F: ${total.fat.toFixed(1)}g<br>
    C: ${total.carbs.toFixed(1)}g<br>
    Kcal: ${total.calories.toFixed(1)} kcal
  `;

  // PFC円グラフ更新
  updatePFCChart(total);
}

// 履歴を更新
function updateHistory() {
  const history = document.getElementById('history');
  history.innerHTML = '';

  const dates = Object.keys(records).sort().reverse();

  if (dates.length === 0) {
    history.textContent = "履歴がありません";
    return;
  }

  dates.forEach(date => {
    const group = records[date];
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = date;
    details.appendChild(summary);

    let dailyTotal = { protein: 0, fat: 0, carbs: 0, calories: 0 };

    group.forEach(record => {
      dailyTotal.protein += record.protein;
      dailyTotal.fat += record.fat;
      dailyTotal.carbs += record.carbs;
      dailyTotal.calories += record.calories;

      const div = document.createElement('div');
      div.textContent = `${record.name} ${record.quantity}${record.unit} ` +
        `P:${record.protein.toFixed(2)} F:${record.fat.toFixed(2)} ` +
        `C:${record.carbs.toFixed(2)} Kcal:${record.calories.toFixed(1)}`;

      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.onclick = () => {
        records[date] = group.filter(r => r.id !== record.id);
        if (records[date].length === 0) delete records[date];
        localStorage.setItem('records', JSON.stringify(records));
        updateHistory();
        updateTotal();
        updateCharts();
      };

      const editBtn = document.createElement('button');
      editBtn.textContent = '修正';
      editBtn.onclick = () => {
        const newQ = parseFloat(prompt('新しい量:', record.quantity));
        if (newQ && newQ > 0) {
          const food = foods.find(f => f.name === record.name);
          record.quantity = newQ;
          record.protein = food.protein * newQ;
          record.fat = food.fat * newQ;
          record.carbs = food.carbs * newQ;
          record.calories = food.calories * newQ;

          localStorage.setItem('records', JSON.stringify(records));
          updateHistory();
          updateTotal();
          updateCharts();
        }
      };

      div.appendChild(editBtn);
      div.appendChild(delBtn);
      details.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `<strong>日合計</strong> P:${dailyTotal.protein.toFixed(1)} ` +
                         `F:${dailyTotal.fat.toFixed(1)} ` +
                         `C:${dailyTotal.carbs.toFixed(1)} ` +
                         `Kcal:${dailyTotal.calories.toFixed(1)}`;
    details.appendChild(totalDiv);

    history.appendChild(details);
  });
}

// カロリー推移＋PFC円グラフ更新
function updateCharts() {
  updateKcalChart();
}

// 折れ線グラフ
function updateKcalChart() {
  const ctx = document.getElementById('kcalChart').getContext('2d');
  const dates = Object.keys(records).sort();
  const caloriesPerDay = dates.map(date =>
    records[date].reduce((acc, cur) => acc + cur.calories, 0)
  );

  if (kcalChart) kcalChart.destroy();

  kcalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Kcal',
        data: caloriesPerDay,
        fill: false,
        borderColor: '#4caf50',
        backgroundColor: '#4caf50',
        tension: 0.1,
        pointRadius: 5
      }]
    },
    options: { responsive: true }
  });
}

// 円グラフ
function updatePFCChart(total) {
  const ctx = document.getElementById('pfcChart').getContext('2d');

  if (pfcChart) pfcChart.destroy();

  pfcChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Protein', 'Fat', 'Carbs'],
      datasets: [{
        data: [total.protein, total.fat, total.carbs],
        backgroundColor: ['#e75480', '#ffd700', '#ff8c70']
      }]
    },
    options: { responsive: true }
  });
}
