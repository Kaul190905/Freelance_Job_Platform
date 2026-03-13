package model;

public class Job {

    private String title;
    private String description;
    private double budget;
    private int clientId;

    public Job(String title,String description,double budget,int clientId){
        this.title=title;
        this.description=description;
        this.budget=budget;
        this.clientId=clientId;
    }

    public String getTitle(){
        return title;
    }

    public String getDescription(){
        return description;
    }

    public double getBudget(){
        return budget;
    }

    public int getClientId(){
        return clientId;
    }

    

}