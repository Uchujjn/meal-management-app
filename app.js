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
  const quantityInput = document.getElementById('quantity').value.trim();
  const quantity = parseFloat(quantityInput);
  const unit = document.getElementById('unit').textContent;

  if (!quantityInput || isNaN(quantity) || quantity <= 0) {
    alert("量を正しく数値で入力してください");
    return;
  }

  const food = foods.find(f => f.name === foodName);
  if (!food) {
    alert("食材が見つかりません");
    return;
  }

  const factor = quantity;

  const today = getToday();
  if (!records[today]) records[today] = [];

  records[today].push({
    id: Date.now(),
    name: foodName,
    quantity: quantity,
    unit: unit,
    protein: (food.protein || 0) * factor,
    fat: (food.fat || 0) * factor,
    carbs: (food.carbs || 0) * factor,
    calories: (food.calories || 0) * factor,
    cost: (parseFloat(food.price) || 0) * factor
  });

  localStorage.setItem('records', JSON.stringify(records));

  updateTotal();
  updateHistory();
  updateCharts();

  document.getElementById('quantity').value = '';
}

// 今日の合計を更新
function updateTotal() {
  let total = { protein: 0, fat: 0, carbs: 0, calories: 0, cost: 0 };
  const today = getToday();

  if (records[today]) {
    records[today].forEach(item => {
      total.protein += item.protein || 0;
      total.fat += item.fat || 0;
      total.carbs += item.carbs || 0;
      total.calories += item.calories || 0;
      total.cost += item.cost || 0;
    });
  }

  document.getElementById('total').innerHTML = `
    【今日の合計】<br>
    P: ${total.protein.toFixed(1)}g<br>
    F: ${total.fat.toFixed(1)}g<br>
    C: ${total.carbs.toFixed(1)}g<br>
    Kcal: ${total.calories.toFixed(1)} kcal<br>
    ¥${total.cost.toFixed(0)}円
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
    if (!Array.isArray(group) || group.length === 0) return; // 安全チェック

    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = date;
    details.appendChild(summary);

    let dailyTotal = { protein: 0, fat: 0, carbs: 0, calories: 0, cost: 0 };

    group.forEach(record => {
      dailyTotal.protein += record.protein || 0;
      dailyTotal.fat += record.fat || 0;
      dailyTotal.carbs += record.carbs || 0;
      dailyTotal.calories += record.calories || 0;
      dailyTotal.cost += record.cost || 0;

      const div = document.createElement('div');
      div.textContent = `${record.name} ${record.quantity}${record.unit} ` +
        `P:${record.protein.toFixed(2)} F:${record.fat.toFixed(2)} ` +
        `C:${record.carbs.toFixed(2)} Kcal:${record.calories.toFixed(1)} ¥${record.cost.toFixed(0)}`;

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
          if (!food) {
            alert("食材情報が見つかりません");
            return;
          }
          record.quantity = newQ;
          record.protein = (food.protein || 0) * newQ;
          record.fat = (food.fat || 0) * newQ;
          record.carbs = (food.carbs || 0) * newQ;
          record.calories = (food.calories || 0) * newQ;
          record.cost = (parseFloat(food.price) || 0) * newQ;

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
                         `Kcal:${dailyTotal.calories.toFixed(1)} 食費: ¥${dailyTotal.cost.toFixed(0)}`;
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
    records[date].reduce((acc, cur) => acc + (cur.calories || 0), 0)
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
        backgroundColor: ['#fc6759ff', '#f9da5eff', '#cf9458ff']
      }]
    },
    options: { responsive: true }
  });
}
