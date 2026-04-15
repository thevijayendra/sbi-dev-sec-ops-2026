"""
CKV_SBI_001 — Ensure RDS instance uses Multi-AZ (RBI BCM requirement)

RBI Master Direction on IT — Annex 7 (Business Continuity Management):
  Critical banking applications must have multi-AZ or equivalent HA.

DevSecOps training — Lab 4: write and run a custom Checkov policy.
Usage:
  checkov -d terraform/ems --external-checks-dir custom_policies --compact
"""

from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck


class DBMultiAZCheck(BaseResourceCheck):
    def __init__(self):
        name                = "Ensure RDS instance uses Multi-AZ (RBI BCM requirement)"
        id                  = "CKV_SBI_001"
        categories          = [CheckCategories.BACKUP_AND_RECOVERY]
        supported_resources = ["aws_db_instance"]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_resources=supported_resources,
        )

    def scan_resource_conf(self, conf):
        # conf["multi_az"] is a list when parsed from Terraform HCL
        multi_az_value = conf.get("multi_az", [False])
        if isinstance(multi_az_value, list):
            multi_az_value = multi_az_value[0]

        if multi_az_value is True:
            return CheckResult.PASSED

        return CheckResult.FAILED


check = DBMultiAZCheck()
