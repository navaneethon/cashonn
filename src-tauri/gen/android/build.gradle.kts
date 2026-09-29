buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.13.2")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

subprojects {
    if (name.startsWith("tauri-plugin-")) {
        afterEvaluate {
            dependencies {
                "implementation"(project(":tauri-android"))
            }
        }
    }
}

tasks.register("clean").configure {
    delete("build")
}

