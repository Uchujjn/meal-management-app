let foods = [];
let records = [];
let chart;

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

function addFood() {
  const foodName = document.getElementById('foodSelect').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  const food = foods.find(f => f.name === foodName);

  const factor = quantity / 100;
  records.push({
    name: foodName,
    calories: food.calories * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor
  });

  updateTotal();
  updateChart();
}

function updateTotal() {
  const total = records.reduce((acc, cur) => {
    acc.calories += cur.calories;
    acc.protein += cur.protein;
    acc.fat += cur.fat;
    acc.carbs += cur.carbs;
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

  document.getElementById('total').innerHTML = `
    カロリー: ${total.calories.toFixed(1)} kcal<br>
    P: ${total.protein.toFixed(1)} g<br>
    F: ${total.fat.toFixed(1)} g<br>
    C: ${total.carbs.toFixed(1)} g
  `;
}

function updateChart() {
  const total = records.reduce((acc, cur) => {
    acc.protein += cur.protein;
    acc.fat += cur.fat;
    acc.carbs += cur.carbs;
    return acc;
  }, { protein: 0, fat: 0, carbs: 0 });

  const ctx = document.getElementById('chart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Protein', 'Fat', 'Carbs'],
      datasets: [{
        data: [total.protein, total.fat, total.carbs],
        backgroundColor: ['#4caf50', '#f44336', '#2196f3']
      }]
    }
  });
}
