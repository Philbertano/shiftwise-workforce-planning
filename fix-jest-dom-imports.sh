#!/bin/bash

# Script to add @testing-library/jest-dom import to test files that are missing it

files=(
  "frontend/src/components/PlanningBoard/__tests__/EmployeePanel.test.tsx"
  "frontend/src/components/PlanningBoard/__tests__/StationCapacityIndicator.test.tsx"
  "frontend/src/components/PlanningBoard/__tests__/MultiAssignmentSlot.validation.test.tsx"
  "frontend/src/components/PlanningBoard/__tests__/PlanningCell.test.tsx"
  "frontend/src/components/StationManagement/__tests__/ProductionLineManager.test.tsx"
  "frontend/src/components/StationManagement/__tests__/StationForm.integration.test.tsx"
  "frontend/src/components/StationManagement/__tests__/StationForm.test.tsx"
  "frontend/src/components/StationManagement/__tests__/StationManagement.integration.test.tsx"
  "frontend/src/components/StationManagement/__tests__/StationList.enhanced.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/SkillCoverageMatrix.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/StaffingLevelMonitor.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/ProductionLineStatus.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/SafetyComplianceIndicator.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/AutomotiveDashboard.test.tsx"
  "frontend/src/components/AutomotiveDashboard/__tests__/ProductionEfficiencyChart.test.tsx"
  "frontend/src/components/ConflictResolution/__tests__/ConflictResolutionModal.test.tsx"
  "frontend/src/components/ConflictResolution/__tests__/ConflictNotification.test.tsx"
  "frontend/src/components/ExecutionMonitoring/__tests__/ExecutionMonitoring.test.tsx"
  "frontend/src/components/ValidationError/__tests__/ValidationErrorDisplay.test.tsx"
  "frontend/src/components/PlanApproval/__tests__/PlanApproval.test.tsx"
  "frontend/src/pages/__tests__/PlanningPage.integration.test.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file"
    # Check if the file already has the import
    if ! grep -q "@testing-library/jest-dom" "$file"; then
      # Find the line with the last import from @testing-library/react
      last_testing_lib_line=$(grep -n "from '@testing-library/react'" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_testing_lib_line" ]; then
        # Insert the jest-dom import after the last @testing-library/react import
        sed -i '' "${last_testing_lib_line}a\\
import '@testing-library/jest-dom';
" "$file"
        echo "Added jest-dom import to $file"
      else
        echo "Could not find @testing-library/react import in $file"
      fi
    else
      echo "jest-dom import already exists in $file"
    fi
  else
    echo "File not found: $file"
  fi
done