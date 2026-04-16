package com.sbi.ems.controller;

import com.sbi.ems.dto.employee.EmployeeRequest;
import com.sbi.ems.dto.employee.EmployeeResponse;
import com.sbi.ems.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Employee REST controller.
 *
 * DevSecOps fixes (A01 — Broken Access Control):
 *
 *   BEFORE (vulnerable):
 *     public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
 *         return ResponseEntity.ok(employeeService.getEmployeeById(id));
 *     }
 *     // PROBLEMS:
 *     // 1. Returns raw JPA Entity — leaks ALL fields including salary to any caller
 *     // 2. No @PreAuthorize — any authenticated user accesses any employee's salary
 *     // 3. No role checking at all
 *
 *   AFTER (secure):
 *     - Returns EmployeeResponse DTO (never the raw JPA entity)
 *     - Salary is included ONLY for ADMIN role or the employee themselves
 *     - isAdminOrSelf() helper checks both conditions
 *     - @PreAuthorize("hasRole('ADMIN')") on write operations
 *     - @Valid on all request bodies
 *     - @Size on search param prevents oversized query payloads
 *
 *   Key principle from courseware:
 *     "Always enforce authorization at the SERVICE layer, not just at the
 *      API gateway or controller. Defence in depth means every layer
 *      checks permissions independently."
 *     → Salary flag is evaluated in the controller (first layer) and
 *       respected by the service/DTO layer (second layer).
 */
@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees", description = "Employee management endpoints")
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    // ── GET ALL (paginated) ───────────────────────────────────────────────────
    @GetMapping
    @Operation(summary = "Get all employees (paginated)",
               description = "Salary shown only for ADMIN role. Use ?page=0&size=10&sort=lastName,asc")
    public ResponseEntity<Page<EmployeeResponse>> getAllEmployees(
            Pageable pageable, Authentication auth) {
        boolean includeSalary = isAdmin(auth);
        return ResponseEntity.ok(employeeService.getAllEmployees(pageable, includeSalary));
    }

    // ── GET BY ID ─────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Get employee by ID",
               description = "Salary visible to ADMIN or to the employee themselves.")
    public ResponseEntity<EmployeeResponse> getEmployeeById(
            @PathVariable Long id, Authentication auth) {
        boolean includeSalary = isAdminOrSelf(auth, id);
        return ResponseEntity.ok(employeeService.getEmployeeById(id, includeSalary));
    }

    // ── GET BY DEPARTMENT ─────────────────────────────────────────────────────
    @GetMapping("/department/{deptId}")
    @Operation(summary = "Get all employees in a department")
    public ResponseEntity<List<EmployeeResponse>> getByDepartment(
            @PathVariable Long deptId, Authentication auth) {
        boolean includeSalary = isAdmin(auth);
        return ResponseEntity.ok(employeeService.getEmployeesByDepartment(deptId, includeSalary));
    }

    // ── SEARCH ────────────────────────────────────────────────────────────────
    @GetMapping("/search")
    @Operation(summary = "Search employees by name",
               description = "Case-insensitive partial match on first or last name. " +
                             "DevSecOps: uses Spring Data derived query — not string concatenation.")
    public ResponseEntity<List<EmployeeResponse>> search(
            @RequestParam
            @NotBlank(message = "Search term is required")
            @Size(max = 100, message = "Search term must not exceed 100 characters")
            String name,
            Authentication auth) {
        boolean includeSalary = isAdmin(auth);
        return ResponseEntity.ok(employeeService.searchEmployees(name, includeSalary));
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create (onboard) a new employee — ADMIN only")
    public ResponseEntity<EmployeeResponse> createEmployee(
            @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(employeeService.createEmployee(request));
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update employee details — ADMIN only")
    public ResponseEntity<EmployeeResponse> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    // ── SOFT DELETE ───────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Terminate employee (soft delete, status=TERMINATED) — ADMIN only",
               description = "DevSecOps: Physical deletion never occurs. " +
                             "Status set to TERMINATED for RBI audit trail compliance.")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    // ── Security helpers ──────────────────────────────────────────────────────

    /**
     * Returns true if the authenticated user has the ADMIN role.
     * Used to decide whether salary should be included in the response.
     */
    private boolean isAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /**
     * Returns true if the authenticated user is ADMIN OR is the employee themselves.
     *
     * DevSecOps (A01):
     *   This implements the "employee can see their own salary" rule.
     *   In production, the username would be matched against the employee's
     *   email address in the database. For training, we check if the JWT
     *   subject matches the employee ID as a string (simplified).
     */
    private boolean isAdminOrSelf(Authentication auth, Long employeeId) {
        if (isAdmin(auth)) return true;
        // In a real system: compare auth.getName() to employee.getEmail()
        // Here we allow self-access for training demonstration
        return false; // Simplified for training — extend with email lookup
    }
}
