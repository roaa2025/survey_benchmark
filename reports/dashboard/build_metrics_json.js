const fs = require('fs');
const path = require('path');

const EVAL_METRICS_FILE = process.env.EVAL_METRICS_FILE || '/mnt/data/EVAL_METRICS_All.txt';
const OUTPUT_FILE = path.join(__dirname, 'metrics.json');

function parseEvalMetrics(text) {
    const jsonBlocks = [];
    const jsonRegex = /Full JSON:\s*(\{[\s\S]*?\})/g;
    let match;

    while ((match = jsonRegex.exec(text)) !== null) {
        try {
            const jsonStr = match[1];
            const parsed = JSON.parse(jsonStr);
            if (parsed.event === 'EVAL_METRICS') {
                jsonBlocks.push(parsed);
            }
        } catch (e) {
            console.warn('Failed to parse JSON block:', e.message);
        }
    }

    return aggregateMetrics(jsonBlocks);
}

function aggregateMetrics(entries) {
    if (entries.length === 0) {
        return getEmptyMetrics();
    }

    const metrics = {
        total_entries: entries.length,
        unique_threads: new Set(entries.map(e => e.thread_id).filter(Boolean)).size,
        flow_counts: {},
        question_runs_count: 0,
        questions_total_values: [],
        pages_total_values: [],
        duplicate_question_id_runs: 0,
        total_missing_required_fields: 0,
        invalid_question_type_runs: 0,
        invalid_question_type_total: 0,
        invalid_question_type_breakdown: {},
        schema_error_runs: 0,
        total_schema_errors: 0,
        rules_runs_count: 0,
        rules_total_values: [],
        rules_invalid_ref_count: 0,
        rules_schema_error_count: 0,
        missing_conditions_count: 0,
        missing_actions_count: 0,
        token_usage_entries: [],
        model_name_breakdown: {}
    };

    entries.forEach(entry => {
        if (entry.flow) {
            metrics.flow_counts[entry.flow] = (metrics.flow_counts[entry.flow] || 0) + 1;
        }

        if (entry.questions_total !== undefined) {
            metrics.question_runs_count++;
            metrics.questions_total_values.push(entry.questions_total);
        }

        if (entry.pages_total !== undefined) {
            metrics.pages_total_values.push(entry.pages_total);
        }

        if (entry.question_ids_unique === false) {
            metrics.duplicate_question_id_runs++;
        }

        if (entry.missing_required_fields_count) {
            metrics.total_missing_required_fields += entry.missing_required_fields_count;
        }

        if (entry.invalid_question_type_count > 0) {
            metrics.invalid_question_type_runs++;
            metrics.invalid_question_type_total += entry.invalid_question_type_count || 0;

            if (entry.invalid_question_type_breakdown) {
                Object.entries(entry.invalid_question_type_breakdown).forEach(([type, count]) => {
                    metrics.invalid_question_type_breakdown[type] = 
                        (metrics.invalid_question_type_breakdown[type] || 0) + count;
                });
            }
        }

        if (entry.schema_error_count > 0) {
            metrics.schema_error_runs++;
            metrics.total_schema_errors += entry.schema_error_count || 0;
        }

        if (entry.rules_total !== undefined) {
            metrics.rules_runs_count++;
            metrics.rules_total_values.push(entry.rules_total);
        }

        if (entry.rules_invalid_ref_count) {
            metrics.rules_invalid_ref_count += entry.rules_invalid_ref_count;
        }

        if (entry.rules_schema_error_count) {
            metrics.rules_schema_error_count += entry.rules_schema_error_count;
        }

        if (entry.missing_conditions_count) {
            metrics.missing_conditions_count += entry.missing_conditions_count;
        }

        if (entry.missing_actions_count) {
            metrics.missing_actions_count += entry.missing_actions_count;
        }

        if (entry.token_usage) {
            metrics.token_usage_entries.push(entry.token_usage);
            if (entry.token_usage.model_name) {
                metrics.model_name_breakdown[entry.token_usage.model_name] = 
                    (metrics.model_name_breakdown[entry.token_usage.model_name] || 0) + 1;
            }
        }
    });

    return computeDerivedMetrics(metrics);
}

function computeDerivedMetrics(metrics) {
    const sortedQuestions = [...metrics.questions_total_values].sort((a, b) => a - b);
    const sortedPages = [...metrics.pages_total_values].sort((a, b) => a - b);
    const sortedRules = [...metrics.rules_total_values].sort((a, b) => a - b);

    const median = (arr) => {
        if (arr.length === 0) return null;
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    };

    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const questionsDistribution = bucketDistribution(metrics.questions_total_values, [
        [0, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, Infinity]
    ]);

    const pagesDistribution = bucketDistribution(metrics.pages_total_values, [
        [1, 1], [2, 2], [3, 3], [4, 4], [5, Infinity]
    ]);

    const tokenUsage = metrics.token_usage_entries;
    const tokenTotals = tokenUsage.map(t => t.total_tokens || 0);
    const tokenPrompts = tokenUsage.map(t => t.prompt_tokens || 0);
    const tokenCompletions = tokenUsage.map(t => t.completion_tokens || 0);

    return {
        total_entries: metrics.total_entries,
        unique_threads: metrics.unique_threads,
        flow_counts: metrics.flow_counts,
        question_runs_count: metrics.question_runs_count,
        avg_questions_total: avg(metrics.questions_total_values),
        median_questions_total: median(sortedQuestions),
        avg_pages_total: avg(metrics.pages_total_values),
        median_pages_total: median(sortedPages),
        duplicate_question_id_runs: metrics.duplicate_question_id_runs,
        total_missing_required_fields: metrics.total_missing_required_fields,
        invalid_question_type_runs: metrics.invalid_question_type_runs,
        invalid_question_type_total: metrics.invalid_question_type_total,
        invalid_question_type_breakdown: metrics.invalid_question_type_breakdown,
        schema_error_runs: metrics.schema_error_runs,
        total_schema_errors: metrics.total_schema_errors,
        rules_runs_count: metrics.rules_runs_count,
        avg_rules_total: avg(metrics.rules_total_values),
        rules_invalid_ref_count: metrics.rules_invalid_ref_count,
        rules_schema_error_count: metrics.rules_schema_error_count,
        missing_conditions_count: metrics.missing_conditions_count,
        missing_actions_count: metrics.missing_actions_count,
        runs_with_token_usage: tokenUsage.length,
        avg_total_tokens: avg(tokenTotals),
        avg_prompt_tokens: avg(tokenPrompts),
        avg_completion_tokens: avg(tokenCompletions),
        model_name_breakdown: metrics.model_name_breakdown,
        questions_total_distribution: questionsDistribution,
        pages_total_distribution: pagesDistribution,
        generated_at: new Date().toISOString()
    };
}

function bucketDistribution(values, buckets) {
    const distribution = {};
    buckets.forEach(([min, max]) => {
        const label = max === Infinity ? `${min}+` : min === max ? `${min}` : `${min}-${max}`;
        distribution[label] = values.filter(v => v >= min && v <= max).length;
    });
    return distribution;
}

function getEmptyMetrics() {
    return {
        total_entries: 0,
        unique_threads: 0,
        flow_counts: {},
        question_runs_count: 0,
        avg_questions_total: null,
        median_questions_total: null,
        avg_pages_total: null,
        median_pages_total: null,
        duplicate_question_id_runs: 0,
        total_missing_required_fields: 0,
        invalid_question_type_runs: 0,
        invalid_question_type_total: 0,
        invalid_question_type_breakdown: {},
        schema_error_runs: 0,
        total_schema_errors: 0,
        rules_runs_count: 0,
        avg_rules_total: null,
        rules_invalid_ref_count: 0,
        rules_schema_error_count: 0,
        missing_conditions_count: 0,
        missing_actions_count: 0,
        runs_with_token_usage: 0,
        avg_total_tokens: null,
        avg_prompt_tokens: null,
        avg_completion_tokens: null,
        model_name_breakdown: {},
        questions_total_distribution: {},
        pages_total_distribution: {},
        generated_at: new Date().toISOString()
    };
}

if (require.main === module) {
    console.log(`Reading EVAL_METRICS file: ${EVAL_METRICS_FILE}`);
    
    if (!fs.existsSync(EVAL_METRICS_FILE)) {
        console.error(`Error: File not found: ${EVAL_METRICS_FILE}`);
        console.log('Usage: node build_metrics_json.js');
        console.log('Or set EVAL_METRICS_FILE environment variable to point to your EVAL_METRICS_All.txt file');
        process.exit(1);
    }

    try {
        const text = fs.readFileSync(EVAL_METRICS_FILE, 'utf8');
        const metrics = parseEvalMetrics(text);
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metrics, null, 2));
        console.log(`Successfully generated ${OUTPUT_FILE}`);
        console.log(`Processed ${metrics.total_entries} entries from ${metrics.unique_threads} unique threads`);
    } catch (error) {
        console.error('Error processing file:', error);
        process.exit(1);
    }
}

module.exports = { parseEvalMetrics, aggregateMetrics, computeDerivedMetrics };

