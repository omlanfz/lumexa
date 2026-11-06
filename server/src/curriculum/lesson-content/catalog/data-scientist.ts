// FILE PATH: server/src/curriculum/lesson-content/catalog/data-scientist.ts
//
// Visuals for the Data Scientist pathway (lineage keys "<module-slug>/<position>").

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, compare, flow, sequence, table, tree, uiMap } from './helpers';

const CE = 'Concept Explanation';

const source: CatalogSource = {
  // ── Python for Data ──────────────────────────────────────────────────────
  'python-for-data/1': [
    flow('ds-workflow', CE, 'The data science workflow: ask a question, collect data, clean it, explore and analyse it, then communicate what you found.', 'Every data project follows these steps.', ['Ask a question|what do we want to know?', 'Collect data|files, surveys, sensors', 'Clean it|fix gaps and mistakes', 'Explore & analyse|find the patterns', 'Communicate|charts and a clear answer'], { perRow: 5 }),
  ],
  'python-for-data/2': [
    uiMap('jupyter-map', CE, 'A map of a Jupyter notebook window: the menu and toolbar across the top, a code cell, the output shown under it, a text cell, and the kernel status in the corner.', 'The parts of a Jupyter notebook.', [
      { id: 'menu', label: 'Menu & toolbar', desc: 'Save, add a cell, and run it — the ▶ Run button or Shift + Enter.', x: 2, y: 2, w: 70, h: 12 },
      { id: 'kernel', label: 'Kernel', desc: 'The Python process running your code. If it shows busy, a cell is still running; restarting it clears all variables.', x: 74, y: 2, w: 24, h: 12 },
      { id: 'text', label: 'Text cell', desc: 'Markdown for headings and notes — explain what you are doing for the next reader.', x: 2, y: 18, w: 96, h: 14 },
      { id: 'code', label: 'Code cell  In [ ]:', desc: 'Write Python here. The number in the brackets shows the order cells were run in.', x: 2, y: 36, w: 96, h: 24 },
      { id: 'out', label: 'Output', desc: 'Whatever the last line produces — a value, a table or a chart — appears right under the cell.', x: 2, y: 64, w: 96, h: 30 },
    ], { title: 'Jupyter notebook (sketch)' }),
  ],
  'python-for-data/3': [
    compare('csv-to-dataframe', CE, 'A CSV file shown as lines of text separated by commas, and the same data as a pandas table with named columns.', 'read_csv turns lines of text into a table.',
      { title: 'data.csv (text)', columns: ['line'], rows: [['name,age,city'], ['Ana,14,Leeds'], ['Ben,15,York'], ['Cai,13,Bath']] },
      { title: 'DataFrame', columns: ['name', 'age', 'city'], rows: [['Ana', 14, 'Leeds'], ['Ben', 15, 'York'], ['Cai', 13, 'Bath']] },
      { arrowLabel: 'pd.read_csv' }),
  ],
  'python-for-data/4': [
    table('filter-rows', CE, 'A table of students where the rows with a score above 80 are highlighted, showing what df[df.score > 80] keeps.', 'Filtering keeps only the rows where the condition is True.', ['name', 'age', 'score'], [['Ana', 14, 91], ['Ben', 15, 64], ['Cai', 13, 85], ['Dee', 14, 72]], { highlights: [{ row: 0, col: 2, tone: 'good' }, { row: 2, col: 2, tone: 'good' }], title: 'df[df.score > 80] keeps the green rows' }),
  ],
  'python-for-data/5': [
    compare('cleaning-before-after', CE, 'Two tables: one with an empty cell, a duplicated row and a number stored as text; the other after cleaning has them fixed.', 'Cleaning fixes gaps, duplicates and wrong types.',
      { title: 'Before', columns: ['name', 'age', 'score'], rows: [['Ana', 14, 91], ['Ben', '', 64], ['Ana', 14, 91], ['Cai', '13', 85]], highlights: [{ row: 1, col: 1, tone: 'bad', note: 'missing value' }, { row: 2, col: 0, tone: 'warn', note: 'duplicate row' }, { row: 3, col: 1, tone: 'warn', note: 'text, not a number' }] },
      { title: 'After', columns: ['name', 'age', 'score'], rows: [['Ana', 14, 91], ['Ben', 14, 64], ['Cai', 13, 85]], highlights: [{ row: 1, col: 1, tone: 'good', note: 'filled with the typical value' }] },
      { arrowLabel: 'dropna · drop_duplicates · astype' }),
  ],
  'python-for-data/6': [
    compare('groupby-before-after', CE, 'Raw sales rows on the left are grouped by region and the sales totalled, giving one row per region on the right.', 'groupby collapses many rows into one per group.',
      { title: 'Raw rows', columns: ['region', 'sales'], rows: [['North', 120], ['South', 90], ['North', 80], ['South', 60], ['North', 50]] },
      { title: 'df.groupby("region")["sales"].sum()', columns: ['region', 'sales'], rows: [['North', 250], ['South', 150]], highlights: [{ row: 0, col: 1, tone: 'good' }] },
      { arrowLabel: 'group & sum' }),
  ],
  'python-for-data/7': [
    V('chart', 'correlation-scatter', CE, 'A scatter plot of hours of sleep against exam score with a rising best-fit line, which shows a positive correlation.', 'Example data: as one value rises the other tends to rise — a positive correlation.', {
      kind: 'scatter', xLabel: 'Hours of sleep', yLabel: 'Test score', fitLine: true,
      series: [{ name: 'Students', points: [{ x: 4, y: 52 }, { x: 5, y: 58 }, { x: 5.5, y: 61 }, { x: 6, y: 66 }, { x: 6.5, y: 64 }, { x: 7, y: 72 }, { x: 7.5, y: 75 }, { x: 8, y: 80 }, { x: 8.5, y: 79 }, { x: 9, y: 86 }] }],
    }, { at: 'end' }),
    V('chart', 'score-histogram', CE, 'A histogram of 24 test scores grouped into bins, showing most scores sit in the middle.', 'Example data: a histogram shows how values are spread out.', {
      kind: 'histogram', bins: 7, xLabel: 'Score', yLabel: 'Students',
      series: [{ values: [48, 55, 58, 61, 63, 64, 66, 67, 68, 69, 70, 71, 72, 72, 74, 75, 76, 78, 79, 82, 85, 88, 91, 95] }],
    }, { at: 'end' }),
  ],
  'python-for-data/8': [
    flow('analysis-pipeline', CE, 'The steps of a full analysis project: state the question, load the data, clean it, explore it, visualise it, and conclude.', 'A full project is the whole workflow, start to finish.', ['Question', 'Load', 'Clean', 'Explore', 'Visualise', 'Conclude'], { perRow: 6 }),
  ],

  // ── Data Visualisation ───────────────────────────────────────────────────
  'data-visualisation/1': [
    cards('honest-vs-misleading', CE, 'Two cards: what makes a chart misleading (a cut-off axis, no labels, too many colours) and what makes it honest.', 'Good charts help people see the truth quickly.', [
      { title: 'Misleading', badge: 'Avoid', tone: 'bad', bullets: ['A y-axis that starts at 90 to exaggerate small gaps', 'No title, units or axis labels', 'Ten colours with no meaning'] },
      { title: 'Honest', badge: 'Aim for', tone: 'good', bullets: ['Bars start at zero', 'A title that states the point, labelled axes with units', 'Colour used only to highlight'] },
    ]),
  ],
  'data-visualisation/2': [
    V('chart', 'mpl-line', CE, 'A line chart of monthly sales over six months, rising overall.', 'Example data: a line shows change over time.', {
      kind: 'line', xLabel: 'Month', yLabel: 'Sales (£)', categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], series: [{ name: 'Sales', values: [120, 135, 128, 160, 172, 190] }],
    }, { at: 'end' }),
    cards('which-plot', CE, 'Three cards describing when to use a line plot, a bar plot and a scatter plot.', 'Pick the plot that matches the question.', [
      { title: 'plt.plot', subtitle: 'Line', bullets: ['Change over time'], tone: 'accent' },
      { title: 'plt.bar', subtitle: 'Bar', bullets: ['Compare categories'], tone: 'info' },
      { title: 'plt.scatter', subtitle: 'Scatter', bullets: ['Relationship between two numbers'], tone: 'good' },
    ], { at: 'end' }),
  ],
  'data-visualisation/3': [
    V('chart', 'distribution-hist', CE, 'A histogram of 30 ages showing how many people fall into each age range.', 'Example data: statistical plots show how values are distributed.', {
      kind: 'histogram', bins: 8, xLabel: 'Age', yLabel: 'People',
      series: [{ values: [12, 13, 13, 14, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 18, 18, 19, 19, 20, 21, 22, 24, 26, 29, 33, 38, 45] }],
    }),
  ],
  'data-visualisation/4': [
    table('chart-chooser', CE, 'A table matching a question about the data to the chart type that answers it best.', 'Start from the question, then choose the chart.', ['If you want to…', 'Use a…'], [['Compare categories', 'bar chart'], ['See a trend over time', 'line chart'], ['Show a relationship between two numbers', 'scatter plot'], ['See how values are spread', 'histogram'], ['Show parts of a whole (few parts)', 'stacked bar or pie chart']]),
  ],
  'data-visualisation/5': [
    cards('story-chart', CE, 'Two cards contrasting a default chart with one that tells a story using a clear title, one highlight colour and direct labels.', 'Design choices turn a chart into a story.', [
      { title: 'Default chart', badge: 'Before', tone: 'warn', bullets: ['Title: "Sales by month"', 'Every bar a different colour', 'Legend you have to hunt through'] },
      { title: 'Storytelling chart', badge: 'After', tone: 'good', bullets: ['Title states the finding: "Sales doubled after the new menu"', 'One highlight colour, the rest grey', 'Labels written right on the bars'] },
    ]),
  ],
  'data-visualisation/6': [
    cards('plotly-actions', CE, 'Three cards for what a reader can do with an interactive Plotly chart: hover for exact values, zoom and pan, and click the legend to hide a series.', 'Interactive charts let readers explore for themselves.', [
      { title: 'Hover', bullets: ['See the exact value in a tooltip'], tone: 'info' },
      { title: 'Zoom & pan', bullets: ['Drag to zoom in on a region; double-click to reset'], tone: 'accent' },
      { title: 'Click the legend', bullets: ['Hide or show one series at a time'], tone: 'good' },
    ]),
  ],
  'data-visualisation/7': [
    flow('dash-callback', CE, 'How a Dash app responds: the layout holds an input control, a callback function runs when the input changes, and the output figure is redrawn.', 'Layout shows things; callbacks make them react.', ['Layout|dropdown + graph', 'User changes the input|picks a value', 'Callback function|@app.callback runs', 'Output updates|new figure is drawn'], { layout: 'cycle' }),
  ],
  'data-visualisation/8': [
    V('mockup', 'dashboard-wireframe', CE, 'A wireframe of a dashboard page with a title and filters at the top, a row of key numbers, a main chart and a detail table, with numbered notes.', 'Plan the layout before you code it.', {
      kind: 'dashboard',
      sections: [
        { label: 'Title & filters', text: 'Dropdowns for date range and category', callout: 'Filters at the top so they apply to everything below.' },
        { label: 'Key numbers', text: 'Total · Average · Best month', callout: 'The headline answers first.' },
        { label: 'Main chart', text: 'One chart that answers the main question', callout: 'One clear chart beats five busy ones.' },
        { label: 'Detail table', text: 'Rows behind the chart', callout: 'Detail for people who want to check.' },
      ],
    }),
  ],

  // ── Machine Learning Projects ────────────────────────────────────────────
  'machine-learning-projects/1': [
    flow('ml-big-picture', CE, 'How machine learning works: training data goes into a learning algorithm that produces a model; new data goes into the model to produce predictions.', 'Learn from examples, then predict on new data.', ['Training data|examples with answers', 'Learning algorithm|finds the pattern', 'Model|the learned pattern', 'New data|no answer yet', 'Prediction|the model’s best guess'], { perRow: 5 }),
  ],
  'machine-learning-projects/2': [
    cards('regression-vs-classification', CE, 'Two cards: regression predicts a number such as a price, and classification predicts a category such as spam or not spam.', 'Number or category? That decides the kind of model.', [
      { title: 'Regression', badge: 'Predicts a number', tone: 'info', bullets: ['House price', 'Tomorrow’s temperature', 'Minutes until delivery'] },
      { title: 'Classification', badge: 'Predicts a category', tone: 'accent', bullets: ['Spam / not spam', 'Cat / dog / bird', 'Pass / fail'] },
    ]),
  ],
  'machine-learning-projects/3': [
    V('train-test', 'split-demo', CE, 'An interactive split of 100 examples into training and test sets with a slider for the share used for training.', 'Never grade a model on the data it learned from.', { total: 100 }, { at: 'end' }),
    table('confusion-matrix', CE, 'A confusion matrix for a spam filter showing true positives, false negatives, false positives and true negatives.', 'Example numbers: correct answers sit on the diagonal.', ['', 'Predicted: spam', 'Predicted: not spam'], [['Actually spam', '40 (correct)', '10 (missed)'], ['Actually not spam', '5 (false alarm)', '45 (correct)']], { highlights: [{ row: 0, col: 1, tone: 'good' }, { row: 1, col: 2, tone: 'good' }, { row: 0, col: 2, tone: 'bad' }, { row: 1, col: 1, tone: 'bad' }], at: 'end' }),
  ],
  'machine-learning-projects/4': [
    V('chart', 'least-squares', CE, 'A scatter plot of house size against price with the straight line that best fits the points.', 'The model is the line y = m·x + b; fitting means finding the best m and b.', {
      kind: 'scatter', xLabel: 'Size (m²)', yLabel: 'Price (£000)', fitLine: true,
      series: [{ name: 'Houses', points: [{ x: 45, y: 110 }, { x: 60, y: 140 }, { x: 70, y: 150 }, { x: 85, y: 190 }, { x: 95, y: 200 }, { x: 110, y: 245 }, { x: 125, y: 255 }, { x: 140, y: 300 }] }],
    }),
  ],
  'machine-learning-projects/5': [
    tree('play-outside-tree', CE, 'A small decision tree: if it is raining, stay in; otherwise if it is warm go to the park, otherwise wear a coat.', 'A decision tree is a flowchart of yes/no questions.', {
      label: 'Raining?', children: [{ label: 'Yes → stay in', tone: 'info' }, { label: 'No → warm?', children: [{ label: 'Yes → go to the park', tone: 'good' }, { label: 'No → wear a coat', tone: 'warn' }] }],
    }, { at: 'end' }),
    flow('forest-vote', CE, 'A random forest: several different trees each give an answer and the most common answer wins the vote.', 'Many different trees vote; the majority answer wins.', ['Tree 1|says: A', 'Tree 2|says: B', 'Tree 3|says: A', 'Vote|A wins 2 to 1'], { perRow: 4, edges: [{ from: 0, to: 3 }, { from: 1, to: 3 }, { from: 2, to: 3 }], at: 'end' }),
  ],
  'machine-learning-projects/6': [
    compare('feature-engineering', CE, 'A table with a date and height and weight is turned into more useful features: the day of the week and body mass index.', 'Engineered features give a model clearer signals.',
      { title: 'Raw columns', columns: ['date', 'height_m', 'weight_kg'], rows: [['2025-03-03', 1.6, 52], ['2025-03-08', 1.75, 80]] },
      { title: 'Engineered features', columns: ['day_of_week', 'bmi'], rows: [['Monday', 20.3], ['Saturday', 26.1]] },
      { arrowLabel: 'new columns' }),
  ],
  'machine-learning-projects/7': [
    V('chart', 'tuning-curve', CE, 'A line chart of accuracy against tree depth: training accuracy keeps rising while test accuracy peaks and then falls.', 'Illustrative numbers: tuning looks for the sweet spot on the test score.', {
      kind: 'line', xLabel: 'max_depth', yLabel: 'Accuracy', categories: ['1', '2', '3', '4', '5', '6', '7', '8'],
      series: [{ name: 'Training', values: [0.62, 0.7, 0.78, 0.85, 0.91, 0.96, 0.99, 1.0] }, { name: 'Test', values: [0.6, 0.68, 0.76, 0.8, 0.79, 0.76, 0.73, 0.7] }],
    }),
  ],
  'machine-learning-projects/8': [
    sequence('predict-api', CE, 'A sequence diagram: a client sends a POST request with JSON features to the prediction API, which asks the saved model and returns JSON with the prediction.', 'The API wraps the model so any app can use it.', [['client', 'Client app'], ['api', 'Prediction API'], ['model', 'Saved model']], [
      { from: 'client', to: 'api', label: 'POST /predict', note: '{"size": 95, "rooms": 3}' },
      { from: 'api', to: 'model', label: 'model.predict(...)' },
      { from: 'model', to: 'api', label: 'prediction', dashed: true },
      { from: 'api', to: 'client', label: '{"price": 240000}', dashed: true },
    ]),
  ],
};

registerVisualCatalog(source);
