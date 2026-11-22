#!/usr/bin/env python3
"""Resize Oracle boot volume using instance principals. Target size default 120 GiB."""
import sys

TARGET_GBS = int(sys.argv[1]) if len(sys.argv) > 1 else 120

try:
    import oci
except ImportError:
    print("MISSING_OCI", flush=True)
    sys.exit(2)

signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
compute = oci.core.ComputeClient(config={}, signer=signer)
block = oci.core.BlockstorageClient(config={}, signer=signer)

inst_id = (
    "ocid1.instance.oc1.eu-frankfurt-1.antheljr6bqqgaaciunjatc3wltv5fpun2uqc55stgwlxuzpndl5ow66ziqa"
)
inst = compute.get_instance(inst_id).data
atts = compute.list_boot_volume_attachments(
    availability_domain=inst.availability_domain,
    compartment_id=inst.compartment_id,
    instance_id=inst_id,
).data
if not atts:
    print("NO_BOOT_ATTACHMENT", flush=True)
    sys.exit(1)

bv_id = atts[0].boot_volume_id
bv = block.get_boot_volume(bv_id).data
print(f"bootVolumeId={bv_id}", flush=True)
print(f"current_size_gbs={bv.size_in_gbs}", flush=True)
print(f"state={bv.lifecycle_state}", flush=True)

if bv.size_in_gbs >= TARGET_GBS:
    print(f"ALREADY_LARGE_ENOUGH target={TARGET_GBS}", flush=True)
    sys.exit(0)

details = oci.core.models.UpdateBootVolumeDetails(size_in_gbs=TARGET_GBS)
updated = block.update_boot_volume(bv_id, details).data
print(f"updated_size_gbs={updated.size_in_gbs}", flush=True)
print(f"updated_state={updated.lifecycle_state}", flush=True)
print("RESIZE_REQUESTED", flush=True)
