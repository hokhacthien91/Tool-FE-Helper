"""Relink missing footage of a COPY project to files found under a folder.

Usage: app/.venv/bin/python dev/relink.py <project.aep> <assets folder>
Matches by file name; opens the project in AE if needed, saves it only when
something was relinked. Never use it on a client's original file.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app"))
from vr import ae  # noqa: E402


def main(project, root):
    project = os.path.abspath(project)
    found = {}
    dup = set()
    for base, _, files in os.walk(root):
        for f in files:
            if f in found:
                dup.add(f)
            found[f] = os.path.join(base, f)
    st = ae.run("status")
    if st.get("file") != project:
        r = ae.run("open", {"path": project, "force": False})
        if r.get("blocked"):
            sys.exit("AE has another unsaved project open (%s): save or close it first." % r.get("file"))
    r = ae.run("relink", {"project": project, "map": found, "save": True})
    print("relinked %d: %s" % (len(r["relinked"]), ", ".join(r["relinked"])))
    print("still missing %d: %s" % (len(r["missing"]), ", ".join(r["missing"])))
    if dup & set(r["relinked"]):
        print("WARNING: same file name found twice, the last one won: " + ", ".join(sorted(dup & set(r["relinked"]))))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
