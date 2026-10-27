def notifySlack(String status, String color) {
    try {
        slackSend(
            channel: env.SLACK_CHANNEL ?: '#crowdstarter-ci',
            color: color,
            message: "CrowdStarter ${status} | ${env.JOB_NAME} #${env.BUILD_NUMBER} | ${env.BUILD_URL}"
        )
    } catch (Exception error) {
        echo "Slack no está configurado o no está disponible: ${error.message}"
    }
}

pipeline {
    agent any

    options {
        timestamps()
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        CI = 'true'
        DB_ENGINE = 'django.db.backends.sqlite3'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: tests and coverage') {
            steps {
                sh '''
                    set -eu
                    rm -rf .venv-ci reports htmlcov coverage.xml jenkins.sqlite3
                    mkdir -p reports
                    python3 -m venv .venv-ci
                    . .venv-ci/bin/activate
                    python -m pip install --upgrade pip
                    python -m pip install -r requirements.txt
                    export DB_NAME="$WORKSPACE/jenkins.sqlite3"
                    python manage.py check
                    python -m pytest api --ds=config.settings -q \
                      --junitxml=reports/backend.xml \
                      --cov=api \
                      --cov-report=term-missing \
                      --cov-report=xml:coverage.xml \
                      --cov-report=html:htmlcov \
                      --cov-fail-under=70
                '''
            }
        }

        stage('Frontend: unit, lint and build') {
            steps {
                sh '''
                    set -eu
                    cd frontend
                    npm ci
                    npm run test:unit:coverage
                    npm run lint
                    npm run build
                '''
            }
        }

        stage('E2E: Chromium') {
            steps {
                sh '''
                    set -eu
                    . .venv-ci/bin/activate
                    export DB_NAME="$WORKSPACE/jenkins.sqlite3"
                    python manage.py migrate --noinput
                    nohup python manage.py runserver 127.0.0.1:8000 > reports/django.log 2>&1 &
                    echo $! > reports/django.pid
                    for attempt in $(seq 1 30); do
                        if curl --fail --silent http://127.0.0.1:8000/api/campanias/ > /dev/null; then
                            break
                        fi
                        sleep 2
                    done
                    if ! curl --fail --silent http://127.0.0.1:8000/api/campanias/ > /dev/null; then
                        cat reports/django.log
                        exit 1
                    fi
                    cd frontend
                    npx playwright install chromium
                    npm run test:e2e
                '''
            }
        }
    }

    post {
        always {
            sh 'if [ -f reports/django.pid ]; then kill "$(cat reports/django.pid)" 2>/dev/null || true; fi'
            junit testResults: 'reports/*.xml, frontend/test-results/*.xml', allowEmptyResults: true
            archiveArtifacts(
                artifacts: 'reports/**/*, coverage.xml, htmlcov/**/*, frontend/dist/**/*, frontend/playwright-report/**/*, frontend/test-results/**/*',
                allowEmptyArchive: true,
                fingerprint: true
            )
        }
        success {
            script { notifySlack('SUCCESS', 'good') }
        }
        failure {
            script { notifySlack('FAILURE', 'danger') }
        }
        unstable {
            script { notifySlack('UNSTABLE', 'warning') }
        }
    }
}
